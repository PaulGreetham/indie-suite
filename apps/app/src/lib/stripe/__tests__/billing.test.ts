import { beforeEach, describe, expect, it, vi } from "vitest"

const { getAdminDbMock, getMock, setMock, collectionMock, docMock, customersCreateMock, customersListMock, subscriptionsRetrieveMock, whereGetMock, linkedSetMock } = vi.hoisted(() => ({
  subscriptionsRetrieveMock: vi.fn(),
  whereGetMock: vi.fn(),
  linkedSetMock: vi.fn(),
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
  getStripeServer: () => ({
    customers: { create: customersCreateMock, list: customersListMock },
    subscriptions: { retrieve: subscriptionsRetrieveMock },
  }),
  getPlanForPriceId: (id: string) => (id === "price_pro" ? "pro" : null),
}))

import { getBilling, getOrCreateStripeCustomer, syncSubscription } from "../billing"

describe("stripe billing helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    docMock.mockReturnValue({ get: getMock, set: setMock })
    const query = { where: vi.fn(() => query), limit: vi.fn(() => query), get: whereGetMock }
    collectionMock.mockReturnValue({ doc: docMock, where: query.where })
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

  describe("syncSubscription", () => {
    function linkedBilling(data: Record<string, unknown> | null) {
      whereGetMock.mockResolvedValue(data
        ? { empty: false, docs: [{ data: () => data, ref: { set: linkedSetMock } }] }
        : { empty: true, docs: [] })
    }

    const subscription = {
      id: "sub_1",
      customer: "cus_1",
      status: "trialing",
      cancel_at_period_end: false,
      trial_start: 1700000000,
      trial_end: 1702592000,
      items: { data: [{ price: { id: "price_pro" }, current_period_end: 1702592000 }] },
    }

    it("re-reads the subscription and writes billing for the uid linked to the customer", async () => {
      subscriptionsRetrieveMock.mockResolvedValue(subscription)
      linkedBilling({ stripeCustomerId: "cus_1" })

      await syncSubscription("sub_1")

      expect(subscriptionsRetrieveMock).toHaveBeenCalledWith("sub_1")
      expect(linkedSetMock).toHaveBeenCalledWith({
        subscriptionId: "sub_1",
        status: "trialing",
        plan: "pro",
        currentPeriodEnd: 1702592000,
        cancelAtPeriodEnd: false,
        endedAt: null,
        trialUsed: true,
        updatedAt: "server-timestamp",
      }, { merge: true })
    })

    it("never clears trialUsed for subscriptions without a trial", async () => {
      subscriptionsRetrieveMock.mockResolvedValue({ ...subscription, status: "active", trial_start: null, trial_end: null })
      linkedBilling({ stripeCustomerId: "cus_1", trialUsed: true })

      await syncSubscription("sub_1")

      expect(linkedSetMock.mock.calls[0][0]).not.toHaveProperty("trialUsed")
    })

    it("ignores subscriptions for customers not linked to a uid, even with metadata.uid", async () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
      subscriptionsRetrieveMock.mockResolvedValue({ ...subscription, metadata: { uid: "victim" } })
      linkedBilling(null)

      await syncSubscription("sub_1")

      expect(linkedSetMock).not.toHaveBeenCalled()
      expect(setMock).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    it("does not overwrite a different live subscription", async () => {
      subscriptionsRetrieveMock.mockResolvedValue({ ...subscription, id: "sub_2", status: "canceled" })
      linkedBilling({ stripeCustomerId: "cus_1", subscriptionId: "sub_1", status: "active" })

      await syncSubscription("sub_2")

      expect(linkedSetMock).not.toHaveBeenCalled()
    })

    it("records cancellation of the current subscription and when it ended", async () => {
      subscriptionsRetrieveMock.mockResolvedValue({ ...subscription, status: "canceled", ended_at: 1703000000 })
      linkedBilling({ stripeCustomerId: "cus_1", subscriptionId: "sub_1", status: "active" })

      await syncSubscription("sub_1")

      expect(linkedSetMock).toHaveBeenCalledWith(expect.objectContaining({ status: "canceled", endedAt: 1703000000 }), { merge: true })
    })
  })
})
