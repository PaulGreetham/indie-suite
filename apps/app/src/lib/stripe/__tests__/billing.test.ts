import { beforeEach, describe, expect, it, vi } from "vitest"

const { getAdminDbMock, getMock, setMock, collectionMock, docMock, customersCreateMock, customersListMock } = vi.hoisted(() => ({
  getAdminDbMock: vi.fn(),
  getMock: vi.fn(),
  setMock: vi.fn(),
  collectionMock: vi.fn(),
  docMock: vi.fn(),
  customersCreateMock: vi.fn(),
  customersListMock: vi.fn(),
}))

vi.mock("@/lib/firebase/admin", () => ({
  AdminFieldValue: { serverTimestamp: () => "server-timestamp" },
  getAdminDb: getAdminDbMock,
}))

vi.mock("../server", () => ({
  getStripeServer: () => ({ customers: { create: customersCreateMock, list: customersListMock } }),
}))

import { getBilling, getOrCreateStripeCustomer } from "../billing"

describe("stripe billing helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    docMock.mockReturnValue({ get: getMock, set: setMock })
    collectionMock.mockReturnValue({ doc: docMock })
    getAdminDbMock.mockReturnValue({ collection: collectionMock })
    customersCreateMock.mockResolvedValue({ id: "cus_new" })
  })

  it("reads billing/{uid}", async () => {
    getMock.mockResolvedValue({ exists: true, data: () => ({ stripeCustomerId: "cus_1" }) })
    await expect(getBilling("user-1")).resolves.toEqual({ stripeCustomerId: "cus_1" })
    expect(collectionMock).toHaveBeenCalledWith("billing")
    expect(docMock).toHaveBeenCalledWith("user-1")
  })

  it("returns the stored customer without calling Stripe", async () => {
    getMock.mockResolvedValue({ exists: true, data: () => ({ stripeCustomerId: "cus_1" }) })
    await expect(getOrCreateStripeCustomer("user-1", "ada@example.com")).resolves.toBe("cus_1")
    expect(customersCreateMock).not.toHaveBeenCalled()
    expect(customersListMock).not.toHaveBeenCalled()
  })

  it("creates a uid-tagged customer idempotently and stores it, never looking up by email (S-02)", async () => {
    getMock.mockResolvedValue({ exists: false, data: () => undefined })

    await expect(getOrCreateStripeCustomer("user-1", "ada@example.com")).resolves.toBe("cus_new")

    expect(customersListMock).not.toHaveBeenCalled()
    expect(customersCreateMock).toHaveBeenCalledWith(
      { email: "ada@example.com", metadata: { uid: "user-1" } },
      { idempotencyKey: "customer-user-1" }
    )
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ stripeCustomerId: "cus_new" }), { merge: true })
  })
})
