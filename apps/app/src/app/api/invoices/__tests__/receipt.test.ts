import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { getAdminAuthMock, getAdminDbMock, verifyIdTokenMock, getMock, renderInvoicePdfMock } = vi.hoisted(() => ({
  getAdminAuthMock: vi.fn(),
  getAdminDbMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
  getMock: vi.fn(),
  renderInvoicePdfMock: vi.fn(),
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

import { GET } from "../[id]/receipt/route"

function call(id: string, token: string | null = "token") {
  const req = new NextRequest(`http://localhost/api/invoices/${id}/receipt`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return GET(req, { params: Promise.resolve({ id }) })
}

function mockInvoice(data: Record<string, unknown> | undefined) {
  getMock.mockResolvedValue({ exists: Boolean(data), id: "inv-1", data: () => data })
}

describe("invoice receipt route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBillingMock.mockResolvedValue({ status: "active" })
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email_verified: true })
    getAdminAuthMock.mockReturnValue({ verifyIdToken: verifyIdTokenMock })
    getAdminDbMock.mockReturnValue({ collection: vi.fn(() => ({ doc: vi.fn(() => ({ get: getMock })) })) })
    renderInvoicePdfMock.mockResolvedValue(new Uint8Array([37, 80, 68, 70]))
  })

  it("returns 401 without a token", async () => {
    const res = await call("inv-1", null)
    expect(res.status).toBe(401)
    expect(renderInvoicePdfMock).not.toHaveBeenCalled()
  })

  it("returns 404 for another user's invoice", async () => {
    mockInvoice({ ownerId: "user-2", invoice_number: "INV-9" })
    const res = await call("inv-1")
    expect(res.status).toBe(404)
    expect(renderInvoicePdfMock).not.toHaveBeenCalled()
  })

  it("returns 404 for an invoice with no ownerId", async () => {
    mockInvoice({ invoice_number: "INV-9" })
    const res = await call("inv-1")
    expect(res.status).toBe(404)
    expect(renderInvoicePdfMock).not.toHaveBeenCalled()
  })

  it("renders the owner's invoice as paid with a safe filename", async () => {
    mockInvoice({ ownerId: "user-1", invoice_number: 'INV 1"\r\n', status: "sent" })
    const res = await call("inv-1")
    expect(res.status).toBe(200)
    expect(renderInvoicePdfMock).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "user-1", status: "paid" }),
      { engine: null }
    )
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="INV-1-receipt.pdf"')
  })

  it("returns a generic 500 when rendering fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    mockInvoice({ ownerId: "user-1" })
    renderInvoicePdfMock.mockRejectedValue(new Error("chromium exploded"))
    const res = await call("inv-1")
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: "internal_error" })
    spy.mockRestore()
  })
})
