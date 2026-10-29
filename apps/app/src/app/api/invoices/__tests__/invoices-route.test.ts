import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { getAdminAuthMock, getAdminDbMock, verifyIdTokenMock, getBillingMock } = vi.hoisted(() => ({
  getAdminAuthMock: vi.fn(),
  getAdminDbMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
  getBillingMock: vi.fn(),
}))

vi.mock("@/lib/firebase/admin", () => ({
  AdminFieldValue: { serverTimestamp: () => "server-ts" },
  getAdminAuth: getAdminAuthMock,
  getAdminDb: getAdminDbMock,
}))

vi.mock("@/lib/stripe/billing", () => ({
  getBilling: getBillingMock,
  isLiveSubscriptionStatus: (s: string | null | undefined) => ["active", "trialing", "past_due"].includes(String(s)),
}))

import { POST } from "../route"
import { DELETE, PATCH } from "../[id]/route"

// Minimal in-memory Admin Firestore: doc get/set/update/delete/create and runTransaction
let store: Map<string, Record<string, unknown>>
let autoId: number

function makeDb() {
  const ref = (path: string) => ({
    id: path.split("/").pop()!,
    path,
    get: async () => ({ exists: store.has(path), id: path.split("/").pop(), data: () => store.get(path) }),
  })
  const tx = {
    get: async (r: { path: string }) => ({ exists: store.has(r.path), data: () => store.get(r.path) }),
    create: (r: { path: string }, data: Record<string, unknown>) => {
      if (store.has(r.path)) throw new Error("ALREADY_EXISTS")
      store.set(r.path, data)
    },
    set: (r: { path: string }, data: Record<string, unknown>) => { store.set(r.path, data) },
    update: (r: { path: string }, data: Record<string, unknown>) => { store.set(r.path, { ...store.get(r.path), ...data }) },
    delete: (r: { path: string }) => { store.delete(r.path) },
  }
  return {
    collection: (name: string) => ({ doc: (id?: string) => ref(`${name}/${id ?? `auto-${++autoId}`}`) }),
    runTransaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  }
}

function req(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/invoices", {
    method,
    headers: { Authorization: "Bearer token" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const reservations = () => [...store.keys()].filter((k) => k.startsWith("invoice_numbers/"))

const base = {
  businessId: "biz-1",
  invoice_number: "INV/001",
  issue_date: "2026-06-01",
  status: "draft",
  line_items: [{ description: "Set", quantity: 1, unit_price: 500 }],
  payments: [{ name: "Final", due_date: "2026-06-15", amount: 500 }],
}

describe("invoice routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    autoId = 0
    store = new Map<string, Record<string, unknown>>([
      ["settings_trading_details/biz-1", { ownerId: "user-1" }],
      ["settings_trading_details/biz-2", { ownerId: "user-2" }],
      ["events/e-1", { ownerId: "user-1" }],
      ["settings_bank_accounts/ba-2", { ownerId: "user-2" }],
    ])
    getAdminDbMock.mockImplementation(makeDb)
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email_verified: true })
    getAdminAuthMock.mockReturnValue({ verifyIdToken: verifyIdTokenMock })
    getBillingMock.mockResolvedValue({ status: "trialing" })
  })

  it("returns 402 without a live plan", async () => {
    getBillingMock.mockResolvedValue({ status: "canceled" })
    expect((await POST(req("POST", base))).status).toBe(402)
  })

  it("creates an invoice owned by the caller and reserves its number", async () => {
    const res = await POST(req("POST", { ...base, eventId: "e-1", ownerId: "user-2", injected: true }))
    expect(res.status).toBe(200)
    const { id } = await res.json()
    const saved = store.get(`invoices/${id}`)!
    expect(saved).toMatchObject({ invoice_number: "INV/001", ownerId: "user-1", businessId: "biz-1", eventId: "e-1", createdAt: "server-ts", updatedAt: "server-ts" })
    expect(saved).not.toHaveProperty("injected")
    expect(saved).not.toHaveProperty("paidAt")
    expect(reservations()).toHaveLength(1)
    expect(store.get(reservations()[0])).toMatchObject({ ownerId: "user-1", invoiceId: id })
  })

  it("rejects a duplicate invoice number with 409", async () => {
    await POST(req("POST", base))
    const res = await POST(req("POST", base))
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({ error: "invoice_number_taken" })
  })

  it("lets different owners use the same number", async () => {
    await POST(req("POST", base))
    verifyIdTokenMock.mockResolvedValue({ uid: "user-2", email_verified: true })
    expect((await POST(req("POST", { ...base, businessId: "biz-2" }))).status).toBe(200)
  })

  it.each([
    ["another tenant's business", { businessId: "biz-2" }],
    ["another tenant's bank account", { bank_account_id: "ba-2" }],
    ["a missing event", { eventId: "e-missing" }],
  ])("returns 404 for %s (S-01)", async (_label, overrides) => {
    expect((await POST(req("POST", { ...base, ...overrides }))).status).toBe(404)
    expect([...store.keys()].some((k) => k.startsWith("invoices/"))).toBe(false)
  })

  it.each([
    ["an unknown status", { status: "refunded" }],
    ["a non-numeric amount", { payments: [{ due_date: "2026-06-15", amount: "500" }] }],
    ["an oversized note", { notes: "x".repeat(5001) }],
  ])("returns 400 for %s", async (_label, overrides) => {
    const res = await POST(req("POST", { ...base, ...overrides }))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: "invalid_invoice" })
  })

  it("sets paidAt only when the status changes to paid, and clears it when it changes back", async () => {
    const { id } = await (await POST(req("POST", base))).json()

    await PATCH(req("PATCH", { status: "paid" }), params(id))
    expect(store.get(`invoices/${id}`)).toMatchObject({ status: "paid", paidAt: "server-ts" })

    store.set(`invoices/${id}`, { ...store.get(`invoices/${id}`), paidAt: "paid-earlier" })
    await PATCH(req("PATCH", { notes: "Thanks", status: "paid" }), params(id))
    expect(store.get(`invoices/${id}`)!.paidAt).toBe("paid-earlier")

    await PATCH(req("PATCH", { status: "sent" }), params(id))
    expect(store.get(`invoices/${id}`)!.paidAt).toBeNull()
  })

  it("swaps the reservation when the number changes and rejects a taken number", async () => {
    const { id } = await (await POST(req("POST", base))).json()
    await POST(req("POST", { ...base, invoice_number: "INV/002" }))

    expect((await PATCH(req("PATCH", { invoice_number: "INV/002" }), params(id))).status).toBe(409)
    expect((await PATCH(req("PATCH", { invoice_number: "INV/003" }), params(id))).status).toBe(200)
    expect((await POST(req("POST", base))).status).toBe(200) // INV/001 was released
    expect(reservations()).toHaveLength(3)
  })

  it("returns 404 when updating or deleting another tenant's invoice", async () => {
    store.set("invoices/foreign", { ownerId: "user-2", invoice_number: "X" })
    expect((await PATCH(req("PATCH", { status: "paid" }), params("foreign"))).status).toBe(404)
    expect((await DELETE(req("DELETE"), params("foreign"))).status).toBe(404)
    expect(store.has("invoices/foreign")).toBe(true)
  })

  it("deletes an invoice and releases its number", async () => {
    const { id } = await (await POST(req("POST", base))).json()
    expect((await DELETE(req("DELETE"), params(id))).status).toBe(200)
    expect(store.has(`invoices/${id}`)).toBe(false)
    expect(reservations()).toHaveLength(0)
  })
})
