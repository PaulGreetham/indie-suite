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

import { DELETE } from "../[id]/route"

// In-memory Admin Firestore: doc get, where().where().limit().get() queries and batches
let store: Map<string, Record<string, unknown>>

function makeDb() {
  const ref = (path: string) => ({
    path,
    id: path.split("/").pop()!,
    get: async () => ({ exists: store.has(path), id: path.split("/").pop(), data: () => store.get(path) }),
  })
  const query = (name: string, filters: Array<[string, unknown]> = [], max = Infinity) => ({
    where: (field: string, _op: string, value: unknown) => query(name, [...filters, [field, value]], max),
    limit: (n: number) => query(name, filters, n),
    get: async () => {
      const docs = [...store.entries()]
        .filter(([path, data]) => path.startsWith(`${name}/`) && filters.every(([f, v]) => data[f] === v))
        .slice(0, max)
        .map(([path, data]) => ({ ref: ref(path), id: path.split("/").pop(), data: () => data }))
      return { empty: docs.length === 0, size: docs.length, docs }
    },
  })
  return {
    collection: (name: string) => ({ ...query(name), doc: (id: string) => ref(`${name}/${id}`) }),
    batch: () => {
      const ops: Array<() => void> = []
      return {
        delete: (r: { path: string }) => { ops.push(() => store.delete(r.path)) },
        set: (r: { path: string }, data: Record<string, unknown>) => { ops.push(() => store.set(r.path, data)) },
        commit: async () => { ops.forEach((op) => op()) },
      }
    },
  }
}

function call(id: string) {
  return DELETE(new NextRequest(`http://localhost/api/businesses/${id}`, { method: "DELETE", headers: { Authorization: "Bearer t" } }), { params: Promise.resolve({ id }) })
}

describe("DELETE /api/businesses/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store = new Map<string, Record<string, unknown>>([
      ["settings_trading_details/biz-1", { ownerId: "user-1", name: "Acme" }],
      ["settings_trading_details/biz-2", { ownerId: "user-1", name: "Other" }],
      ["settings_trading_details/biz-x", { ownerId: "user-2", name: "Foreign" }],
      ["customers/c-1", { ownerId: "user-1", businessId: "biz-1" }],
      ["venues/v-1", { ownerId: "user-1", businessId: "biz-1" }],
      ["events/e-1", { ownerId: "user-1", businessId: "biz-1" }],
      ["contracts/k-1", { ownerId: "user-1", businessId: "biz-1" }],
      ["settings_bank_accounts/ba-1", { ownerId: "user-1", businessId: "biz-1" }],
      ["customers/c-2", { ownerId: "user-1", businessId: "biz-2" }],
      ["customers/c-x", { ownerId: "user-2", businessId: "biz-1" }],
      ["integrations_firma/biz-1", { businessId: "biz-1", workspaceId: "ws_1", workspaceApiKey: "secret" }],
    ])
    getAdminDbMock.mockImplementation(makeDb)
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email_verified: true })
    getAdminAuthMock.mockReturnValue({ verifyIdToken: verifyIdTokenMock })
    getBillingMock.mockResolvedValue({ status: "active" })
  })

  it("deletes the business, its own records and Firma integration, and queues the workspace for cleanup", async () => {
    const res = await call("biz-1")
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true, deletedRecords: 5 })
    for (const path of ["settings_trading_details/biz-1", "customers/c-1", "venues/v-1", "events/e-1", "contracts/k-1", "settings_bank_accounts/ba-1", "integrations_firma/biz-1"]) {
      expect(store.has(path)).toBe(false)
    }
    expect(store.get("firma_workspace_cleanup/ws_1")).toMatchObject({ workspaceId: "ws_1", businessId: "biz-1", ownerId: "user-1" })
  })

  it("leaves other businesses and other tenants untouched", async () => {
    await call("biz-1")
    expect(store.has("customers/c-2")).toBe(true)
    expect(store.has("customers/c-x")).toBe(true)
    expect(store.has("settings_trading_details/biz-2")).toBe(true)
  })

  it("refuses with 409 and deletes nothing while the business has invoices", async () => {
    store.set("invoices/i-1", { ownerId: "user-1", businessId: "biz-1" })
    const before = store.size
    const res = await call("biz-1")
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({ error: "business_has_invoices" })
    expect(store.size).toBe(before)
  })

  it("returns 404 for another tenant's business", async () => {
    const res = await call("biz-x")
    expect(res.status).toBe(404)
    expect(store.has("settings_trading_details/biz-x")).toBe(true)
  })

  it("returns 402 without a live plan", async () => {
    getBillingMock.mockResolvedValue({ status: "canceled" })
    expect((await call("biz-1")).status).toBe(402)
    expect(store.has("settings_trading_details/biz-1")).toBe(true)
  })

  it("does not queue a cleanup when the business has no Firma workspace", async () => {
    await call("biz-2")
    expect([...store.keys()].some((k) => k.startsWith("firma_workspace_cleanup/"))).toBe(false)
  })
})
