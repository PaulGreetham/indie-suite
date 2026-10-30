import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { getAdminAuthMock, getAdminDbMock, verifyIdTokenMock, renderInvoicePdfMock, whereMock } = vi.hoisted(() => ({
  getAdminAuthMock: vi.fn(),
  getAdminDbMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
  renderInvoicePdfMock: vi.fn(),
  whereMock: vi.fn(),
}))

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: getAdminAuthMock,
  getAdminDb: getAdminDbMock,
}))

vi.mock("@/lib/pdf/render", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/pdf/render")>()),
  renderInvoicePdf: renderInvoicePdfMock,
}))

vi.mock("@sparticuz/chromium", () => ({ default: {} }))
vi.mock("puppeteer-core", () => ({ default: { launch: vi.fn() } }))
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: vi.fn() }))
vi.mock("@/components/pdf/InvoicePdf", () => ({ InvoicePdf: () => null }))


const { getBillingMock } = vi.hoisted(() => ({ getBillingMock: vi.fn() }))

vi.mock("@/lib/stripe/billing", () => ({
  getBilling: getBillingMock,
  isLiveSubscriptionStatus: (s: string | null | undefined) => ["active", "trialing", "past_due"].includes(String(s)),
}))

const { rateLimitMock } = vi.hoisted(() => ({ rateLimitMock: vi.fn() }))

vi.mock("@/lib/server/rate-limit", () => ({ rateLimit: rateLimitMock }))

import { HttpError } from "@/lib/server/auth"
import { GET } from "../[id]/pdf/route"

type Docs = Record<string, Record<string, Record<string, unknown> | undefined>>

// Admin Firestore fake: doc(id).get() per collection, plus a where().where().limit().get() query on bank accounts
function mockDb(docs: Docs, bankQueryResult: Record<string, unknown> | null = null) {
  getAdminDbMock.mockReturnValue({
    collection: vi.fn((name: string) => {
      const query = {
        where: whereMock.mockImplementation(() => query),
        limit: vi.fn(() => query),
        get: vi.fn(async () => ({ empty: !bankQueryResult, docs: bankQueryResult ? [{ data: () => bankQueryResult }] : [] })),
      }
      return {
        ...query,
        doc: vi.fn((id: string) => ({
          get: vi.fn(async () => {
            const data = docs[name]?.[id]
            return { exists: Boolean(data), id, data: () => data }
          }),
        })),
      }
    }),
  })
}

function call(id: string, token: string | null = "token") {
  const req = new NextRequest(`http://localhost/api/invoices/${id}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return GET(req, { params: Promise.resolve({ id }) })
}

function renderedPayload(): Record<string, unknown> {
  return renderInvoicePdfMock.mock.calls[0][0] as Record<string, unknown>
}

const baseInvoice = { ownerId: "user-1", businessId: "biz-1", invoice_number: "INV-001" }
const ownBank = { ownerId: "user-1", name: "Main", accountNumberOrIban: "GB00OWN" }

describe("invoice pdf route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBillingMock.mockResolvedValue({ status: "active" })
    rateLimitMock.mockResolvedValue(undefined)
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email_verified: true })
    getAdminAuthMock.mockReturnValue({ verifyIdToken: verifyIdTokenMock })
    renderInvoicePdfMock.mockResolvedValue(new Uint8Array([37, 80, 68, 70]))
  })

  it("returns 401 without a token", async () => {
    mockDb({ invoices: { "inv-1": baseInvoice } })
    const res = await call("inv-1", null)
    expect(res.status).toBe(401)
    expect(renderInvoicePdfMock).not.toHaveBeenCalled()
  })

  it.each([
    ["another user's invoice", { ...baseInvoice, ownerId: "user-2" }],
    ["an invoice with no ownerId", { ...baseInvoice, ownerId: undefined }],
  ])("returns 404 for %s", async (_label, invoice) => {
    mockDb({ invoices: { "inv-1": invoice } })
    const res = await call("inv-1")
    expect(res.status).toBe(404)
    expect(renderInvoicePdfMock).not.toHaveBeenCalled()
  })

  it("strips notes, payment link and bank account when their toggles are off", async () => {
    mockDb({ invoices: { "inv-1": { ...baseInvoice, notes: "n", payment_link: "https://pay", bank_account: { name: "inline" } } } })
    const res = await call("inv-1")
    expect(res.status).toBe(200)
    const payload = renderedPayload()
    expect(payload).not.toHaveProperty("notes")
    expect(payload).not.toHaveProperty("payment_link")
    expect(payload).not.toHaveProperty("bank_account")
  })

  it("keeps notes and payment link when enabled", async () => {
    mockDb({ invoices: { "inv-1": { ...baseInvoice, include_notes: true, notes: "n", include_payment_link: true, payment_link: "https://pay" } } })
    await call("inv-1")
    expect(renderedPayload()).toMatchObject({ notes: "n", payment_link: "https://pay" })
  })

  it("includes the caller's own bank account by id", async () => {
    mockDb({
      invoices: { "inv-1": { ...baseInvoice, include_bank_account: true, bank_account_id: "ba-1" } },
      settings_bank_accounts: { "ba-1": ownBank },
    })
    await call("inv-1")
    expect(renderedPayload().bank_account).toMatchObject({ accountNumberOrIban: "GB00OWN" })
  })

  it("never reads another tenant's bank account (S-01)", async () => {
    mockDb({
      invoices: { "inv-1": { ...baseInvoice, include_bank_account: true, bank_account_id: "ba-victim" } },
      settings_bank_accounts: { "ba-victim": { ownerId: "user-2", accountNumberOrIban: "GB00VICTIM" } },
    })
    const res = await call("inv-1")
    expect(res.status).toBe(200)
    expect(JSON.stringify(renderedPayload())).not.toContain("GB00VICTIM")
  })

  it("falls back to the caller's first bank account for the business, scoped by token uid", async () => {
    mockDb({ invoices: { "inv-1": { ...baseInvoice, include_bank_account: true } } }, ownBank)
    await call("inv-1")
    expect(whereMock).toHaveBeenCalledWith("ownerId", "==", "user-1")
    expect(whereMock).toHaveBeenCalledWith("businessId", "==", "biz-1")
    expect(renderedPayload().bank_account).toMatchObject({ accountNumberOrIban: "GB00OWN" })
  })

  it("fills event_title from the caller's own event only", async () => {
    mockDb({
      invoices: { "inv-1": { ...baseInvoice, eventId: "evt-1" }, "inv-2": { ...baseInvoice, eventId: "evt-2" } },
      events: { "evt-1": { ownerId: "user-1", title: "Launch Party" }, "evt-2": { ownerId: "user-2", title: "Secret" } },
    })
    await call("inv-1")
    expect(renderedPayload().event_title).toBe("Launch Party")
    renderInvoicePdfMock.mockClear()
    await call("inv-2")
    expect(renderedPayload()).not.toHaveProperty("event_title")
  })

  it("returns the PDF with a sanitised quoted filename", async () => {
    mockDb({ invoices: { "inv-1": { ...baseInvoice, invoice_number: 'INV 1"\r\n' } } })
    const res = await call("inv-1")
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="INV-1.pdf"')
  })

  it.each([null, { status: "canceled" }, { status: "incomplete_expired" }])("returns 402 without a live plan (%j)", async (billing) => {
    getBillingMock.mockResolvedValue(billing)
    mockDb({ invoices: { "inv-1": baseInvoice } })
    const res = await call("inv-1")
    expect(res.status).toBe(402)
    await expect(res.json()).resolves.toEqual({ error: "subscription_required" })
    expect(renderInvoicePdfMock).not.toHaveBeenCalled()
  })

  it("returns 429 with Retry-After when the user is rate limited", async () => {
    mockDb({ invoices: { "inv-1": baseInvoice } })
    rateLimitMock.mockRejectedValue(new HttpError(429, "rate_limited", 30))
    const res = await call("inv-1")
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("30")
    await expect(res.json()).resolves.toEqual({ error: "rate_limited" })
    expect(rateLimitMock).toHaveBeenCalledWith("user-1", "pdf")
    expect(renderInvoicePdfMock).not.toHaveBeenCalled()
  })
})
