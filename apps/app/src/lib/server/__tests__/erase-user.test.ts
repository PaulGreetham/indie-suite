import { beforeEach, describe, expect, it, vi } from "vitest"

const { getAdminDbMock, deleteUserMock, customersDelMock } = vi.hoisted(() => ({
  getAdminDbMock: vi.fn(),
  deleteUserMock: vi.fn(),
  customersDelMock: vi.fn(),
}))

vi.mock("@/lib/firebase/admin", () => ({
  AdminFieldValue: { serverTimestamp: () => "server-ts" },
  getAdminDb: getAdminDbMock,
  getAdminAuth: () => ({ deleteUser: deleteUserMock }),
}))
vi.mock("@/lib/stripe/server", () => ({
  getStripeServer: () => ({ customers: { del: customersDelMock } }),
  getPlanForPriceId: () => null,
}))

import { eraseUser } from "../erase-user"

let store: Map<string, Record<string, unknown>>

function makeDb() {
  const ref = (path: string) => ({
    path,
    id: path.split("/").pop()!,
    get: async () => ({ exists: store.has(path), data: () => store.get(path) }),
    delete: async () => { store.delete(path) },
  })
  return {
    collection: (name: string) => ({
      doc: (id: string) => ref(`${name}/${id}`),
      where: (field: string, _op: string, value: unknown) => ({
        get: async () => ({
          docs: [...store.entries()]
            .filter(([p, d]) => p.startsWith(`${name}/`) && d[field] === value)
            .map(([p]) => ({ ref: ref(p) })),
        }),
      }),
    }),
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

describe("eraseUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store = new Map<string, Record<string, unknown>>([
      ["settings_trading_details/biz-1", { ownerId: "user-1" }],
      ["customers/c-1", { ownerId: "user-1", businessId: "biz-1" }],
      ["invoices/i-1", { ownerId: "user-1", businessId: "biz-1" }],
      ["invoice_numbers/user-1__abc", { ownerId: "user-1", invoiceId: "i-1" }],
      ["contracts/k-1", { ownerId: "user-1" }],
      ["integrations_firma/biz-1", { businessId: "biz-1", workspaceId: "ws_1", workspaceApiKey: "secret" }],
      ["billing/user-1", { stripeCustomerId: "cus_1", status: "canceled" }],
      ["customers/c-2", { ownerId: "user-2" }],
      ["billing/user-2", { stripeCustomerId: "cus_2" }],
    ])
    getAdminDbMock.mockImplementation(makeDb)
    deleteUserMock.mockResolvedValue(undefined)
    customersDelMock.mockResolvedValue({ deleted: true })
  })

  it("erases everything the user owns, their Stripe customer and Auth user, and queues Firma workspaces", async () => {
    const result = await eraseUser("user-1")

    expect(result).toEqual({ uid: "user-1", deletedDocs: 5, stripeCustomerDeleted: true, authUserDeleted: true })
    for (const p of ["settings_trading_details/biz-1", "customers/c-1", "invoices/i-1", "invoice_numbers/user-1__abc", "contracts/k-1", "integrations_firma/biz-1", "billing/user-1"]) {
      expect(store.has(p)).toBe(false)
    }
    expect(store.get("firma_workspace_cleanup/ws_1")).toMatchObject({ businessId: "biz-1", ownerId: "user-1", reason: "account_erased" })
    expect(customersDelMock).toHaveBeenCalledWith("cus_1")
    expect(deleteUserMock).toHaveBeenCalledWith("user-1")
  })

  it("leaves other users untouched", async () => {
    await eraseUser("user-1")
    expect(store.has("customers/c-2")).toBe(true)
    expect(store.has("billing/user-2")).toBe(true)
  })

  it("can be re-run after a partial failure (already-deleted Stripe customer and Auth user)", async () => {
    customersDelMock.mockRejectedValueOnce(new Error("stripe down"))
    await expect(eraseUser("user-1")).rejects.toThrow("stripe down")
    expect(store.has("billing/user-1")).toBe(true) // kept so the retry still knows the customer

    customersDelMock.mockRejectedValueOnce(Object.assign(new Error("No such customer"), { code: "resource_missing" }))
    deleteUserMock.mockRejectedValueOnce(Object.assign(new Error("not found"), { code: "auth/user-not-found" }))
    await expect(eraseUser("user-1")).resolves.toMatchObject({ authUserDeleted: false })
    expect(store.has("billing/user-1")).toBe(false)
  })

  it("handles a user who never subscribed", async () => {
    store.delete("billing/user-1")
    await expect(eraseUser("user-1")).resolves.toMatchObject({ stripeCustomerDeleted: false })
    expect(customersDelMock).not.toHaveBeenCalled()
  })
})
