import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getStripeServerMock,
  getPriceIdForPlanMock,
  getAppBaseUrlMock,
  getAdminAuthMock,
  verifyIdTokenMock,
  getBillingMock,
  getOrCreateStripeCustomerMock,
  sessionsCreateMock,
  subscriptionsListMock,
  syncSubscriptionMock,
} = vi.hoisted(() => ({
  getStripeServerMock: vi.fn(),
  getPriceIdForPlanMock: vi.fn(),
  getAppBaseUrlMock: vi.fn(),
  getAdminAuthMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
  getBillingMock: vi.fn(),
  getOrCreateStripeCustomerMock: vi.fn(),
  sessionsCreateMock: vi.fn(),
  subscriptionsListMock: vi.fn(),
  syncSubscriptionMock: vi.fn(),
}))

vi.mock("@/lib/stripe/server", () => ({
  getStripeServer: getStripeServerMock,
  getPriceIdForPlan: getPriceIdForPlanMock,
  getAppBaseUrl: getAppBaseUrlMock,
}))

vi.mock("@/lib/stripe/billing", () => ({
  TRIAL_DAYS: 90,
  getBilling: getBillingMock,
  getOrCreateStripeCustomer: getOrCreateStripeCustomerMock,
  syncSubscription: syncSubscriptionMock,
  isLiveSubscriptionStatus: (s: string | null | undefined) => ["active", "trialing", "past_due"].includes(String(s)),
}))

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: getAdminAuthMock,
  getAdminDb: vi.fn(),
}))

import { POST } from "../create-checkout-session/route"

function request(body: unknown, token: string | null = "token") {
  return new Request("http://localhost/api/stripe/create-checkout-session", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  }) as never
}

describe("stripe create-checkout-session route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAppBaseUrlMock.mockReturnValue("https://app.example.com")
    getPriceIdForPlanMock.mockReturnValue("price_pro_monthly")
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email: "ada@example.com", email_verified: true })
    getAdminAuthMock.mockReturnValue({ verifyIdToken: verifyIdTokenMock })
    getOrCreateStripeCustomerMock.mockResolvedValue("cus_user1")
    getBillingMock.mockResolvedValue({ stripeCustomerId: "cus_user1" })
    sessionsCreateMock.mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.com/cs_1" })
    subscriptionsListMock.mockResolvedValue({ data: [] })
    getStripeServerMock.mockReturnValue({
      checkout: { sessions: { create: sessionsCreateMock } },
      subscriptions: { list: subscriptionsListMock },
    })
  })

  it("returns 401 without a token", async () => {
    const response = await POST(request({ plan: "pro" }, null))
    expect(response.status).toBe(401)
    expect(sessionsCreateMock).not.toHaveBeenCalled()
  })

  it("returns 403 for an unverified email (S-02)", async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email: "victim@example.com", email_verified: false })
    const response = await POST(request({ plan: "pro" }))
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: "email_unverified" })
    expect(getOrCreateStripeCustomerMock).not.toHaveBeenCalled()
  })

  it("returns 400 when plan is missing", async () => {
    const response = await POST(request({}))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "missing_plan" })
  })

  it("returns 400 when the plan does not resolve to a price id", async () => {
    getPriceIdForPlanMock.mockReturnValue(null)
    const response = await POST(request({ plan: "unknown" }))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "invalid_plan" })
  })

  it("uses the uid's stored customer, ignores a client email, and tags the session with the uid", async () => {
    const response = await POST(request({ plan: "pro", interval: "yearly", email: "victim@example.com" }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ id: "cs_1", url: "https://checkout.stripe.com/cs_1" })
    expect(getPriceIdForPlanMock).toHaveBeenCalledWith("pro", "yearly")
    expect(getOrCreateStripeCustomerMock).toHaveBeenCalledWith("user-1", "ada@example.com")
    expect(sessionsCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      mode: "subscription",
      customer: "cus_user1",
      client_reference_id: "user-1",
      metadata: { uid: "user-1" },
      line_items: [{ price: "price_pro_monthly", quantity: 1 }],
      payment_method_collection: "always",
      subscription_data: expect.objectContaining({ metadata: { uid: "user-1" } }),
      success_url: "https://app.example.com/subscribe?checkout=success",
      cancel_url: "https://app.example.com/subscribe?checkout=cancelled",
    }))
    expect(sessionsCreateMock.mock.calls[0][0]).not.toHaveProperty("customer_email")
  })

  it("adds the 90-day trial for a new account and still collects a card", async () => {
    getBillingMock.mockResolvedValue(null)
    await POST(request({ plan: "pro" }))
    const params = sessionsCreateMock.mock.calls[0][0]
    expect(params.payment_method_collection).toBe("always")
    expect(params.subscription_data).toEqual({
      metadata: { uid: "user-1" },
      trial_period_days: 90,
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
    })
  })

  it.each([
    ["the trial was used", { stripeCustomerId: "cus_user1", trialUsed: true }],
    ["a previous subscription ended", { stripeCustomerId: "cus_user1", subscriptionId: "sub_old", status: "canceled" }],
  ])("offers no trial when %s", async (_label, billing) => {
    getBillingMock.mockResolvedValue(billing)
    await POST(request({ plan: "pro" }))
    const params = sessionsCreateMock.mock.calls[0][0]
    expect(params.payment_method_collection).toBe("always")
    expect(params.subscription_data).toEqual({ metadata: { uid: "user-1" } })
  })

  it.each(["active", "trialing", "past_due"])("returns 409 when the user already has a %s subscription", async (status) => {
    getBillingMock.mockResolvedValue({ stripeCustomerId: "cus_user1", subscriptionId: "sub_1", status })
    const response = await POST(request({ plan: "pro" }))
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: "already_subscribed" })
    expect(sessionsCreateMock).not.toHaveBeenCalled()
  })

  it("returns 409 and records the subscription when Stripe has a live one billing doesn't show yet", async () => {
    subscriptionsListMock.mockResolvedValue({ data: [{ id: "sub_trial", status: "trialing" }] })
    const response = await POST(request({ plan: "pro" }))
    expect(subscriptionsListMock).toHaveBeenCalledWith({ customer: "cus_user1", status: "all", limit: 10 })
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: "already_subscribed" })
    expect(syncSubscriptionMock).toHaveBeenCalledWith("sub_trial")
    expect(sessionsCreateMock).not.toHaveBeenCalled()
  })

  it("offers no trial when Stripe has an ended subscription billing doesn't show", async () => {
    subscriptionsListMock.mockResolvedValue({ data: [{ id: "sub_old", status: "canceled" }] })
    await POST(request({ plan: "pro" }))
    expect(sessionsCreateMock.mock.calls[0][0].subscription_data).toEqual({ metadata: { uid: "user-1" } })
  })

  it("returns a generic error when Stripe fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    sessionsCreateMock.mockRejectedValue(new Error("No such price: price_x"))
    const response = await POST(request({ plan: "pro" }))
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "stripe_error" })
    spy.mockRestore()
  })
})
