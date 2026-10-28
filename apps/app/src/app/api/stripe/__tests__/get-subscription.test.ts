import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { getStripeServerMock, getAdminAuthMock, verifyIdTokenMock, getBillingMock, subscriptionsListMock, customersListMock } = vi.hoisted(() => ({
  getStripeServerMock: vi.fn(),
  getAdminAuthMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
  getBillingMock: vi.fn(),
  subscriptionsListMock: vi.fn(),
  customersListMock: vi.fn(),
}))

vi.mock("@/lib/stripe/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe/server")>()),
  getStripeServer: getStripeServerMock,
}))

vi.mock("@/lib/stripe/billing", () => ({
  getBilling: getBillingMock,
}))

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: getAdminAuthMock,
  getAdminDb: vi.fn(),
}))

import { POST } from "../get-subscription/route"

function request(body: unknown = {}, token: string | null = "token") {
  return new Request("http://localhost/api/stripe/get-subscription", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  }) as never
}

describe("stripe get-subscription route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email: "ada@example.com", email_verified: true })
    getAdminAuthMock.mockReturnValue({ verifyIdToken: verifyIdTokenMock })
    getStripeServerMock.mockReturnValue({
      subscriptions: { list: subscriptionsListMock },
      customers: { list: customersListMock },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns 401 without a token", async () => {
    const response = await POST(request({ email: "victim@example.com" }, null))
    expect(response.status).toBe(401)
    expect(subscriptionsListMock).not.toHaveBeenCalled()
  })

  it("returns an empty payload when the uid has no linked customer, without searching by email", async () => {
    getBillingMock.mockResolvedValue(null)

    const response = await POST(request({ email: "victim@example.com" }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      exists: false, plan: null, status: null, customerId: null, subscriptionId: null, priceId: null,
    })
    expect(getBillingMock).toHaveBeenCalledWith("user-1")
    expect(customersListMock).not.toHaveBeenCalled()
  })

  it("returns the preferred subscription for the uid's stored customer only", async () => {
    vi.stubEnv("PRICE_PORTFOLIO_MONTHLY", "price_portfolio_monthly")
    getBillingMock.mockResolvedValue({ stripeCustomerId: "cus_user1" })
    subscriptionsListMock.mockResolvedValue({
      data: [
        { id: "sub_old", created: 1, status: "canceled", items: { data: [{ price: { id: "price_old" } }] } },
        { id: "sub_new", created: 2, status: "active", items: { data: [{ price: { id: "price_portfolio_monthly" } }] } },
      ],
    })

    const response = await POST(request({ email: "victim@example.com", customerId: "cus_victim" }))

    expect(subscriptionsListMock).toHaveBeenCalledWith({ customer: "cus_user1", status: "all", limit: 20 })
    await expect(response.json()).resolves.toEqual({
      exists: true,
      plan: "pro+",
      status: "active",
      customerId: "cus_user1",
      subscriptionId: "sub_new",
      priceId: "price_portfolio_monthly",
    })
  })

  it("returns exists with no subscription when the customer has none", async () => {
    getBillingMock.mockResolvedValue({ stripeCustomerId: "cus_user1" })
    subscriptionsListMock.mockResolvedValue({ data: [] })

    const response = await POST(request())

    await expect(response.json()).resolves.toEqual({
      exists: true, plan: null, status: null, customerId: "cus_user1", subscriptionId: null, priceId: null,
    })
  })
})
