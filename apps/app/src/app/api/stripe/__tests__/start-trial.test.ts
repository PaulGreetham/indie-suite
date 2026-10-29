import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getStripeServerMock,
  getPriceIdForPlanMock,
  getAdminAuthMock,
  verifyIdTokenMock,
  getBillingMock,
  getOrCreateStripeCustomerMock,
  syncSubscriptionMock,
  subscriptionsCreateMock,
} = vi.hoisted(() => ({
  getStripeServerMock: vi.fn(),
  getPriceIdForPlanMock: vi.fn(),
  getAdminAuthMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
  getBillingMock: vi.fn(),
  getOrCreateStripeCustomerMock: vi.fn(),
  syncSubscriptionMock: vi.fn(),
  subscriptionsCreateMock: vi.fn(),
}))

vi.mock("@/lib/stripe/server", () => ({
  getStripeServer: getStripeServerMock,
  getPriceIdForPlan: getPriceIdForPlanMock,
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

import { POST } from "../start-trial/route"

function request(body: unknown, token: string | null = "token") {
  return new Request("http://localhost/api/stripe/start-trial", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  }) as never
}

describe("stripe start-trial route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPriceIdForPlanMock.mockReturnValue("price_pro_monthly")
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email: "ada@example.com", email_verified: true })
    getAdminAuthMock.mockReturnValue({ verifyIdToken: verifyIdTokenMock })
    getBillingMock.mockResolvedValue(null)
    getOrCreateStripeCustomerMock.mockResolvedValue("cus_user1")
    subscriptionsCreateMock.mockResolvedValue({ id: "sub_trial" })
    syncSubscriptionMock.mockResolvedValue(undefined)
    getStripeServerMock.mockReturnValue({ subscriptions: { create: subscriptionsCreateMock } })
  })

  it("returns 401 without a token", async () => {
    const response = await POST(request({ plan: "pro" }, null))
    expect(response.status).toBe(401)
    expect(subscriptionsCreateMock).not.toHaveBeenCalled()
  })

  it("returns 403 for an unverified email", async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email_verified: false })
    const response = await POST(request({ plan: "pro" }))
    expect(response.status).toBe(403)
    expect(subscriptionsCreateMock).not.toHaveBeenCalled()
  })

  it.each([
    [{}, "missing_plan"],
    [{ plan: "unknown" }, "invalid_plan"],
  ])("returns 400 for %j", async (body, error) => {
    if (error === "invalid_plan") getPriceIdForPlanMock.mockReturnValue(null)
    const response = await POST(request(body))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error })
  })

  it("creates a 90-day card-free trial on the uid's customer and records it immediately", async () => {
    const response = await POST(request({ plan: "pro", interval: "yearly" }))

    expect(response.status).toBe(200)
    expect(getPriceIdForPlanMock).toHaveBeenCalledWith("pro", "yearly")
    expect(getOrCreateStripeCustomerMock).toHaveBeenCalledWith("user-1", "ada@example.com")
    expect(subscriptionsCreateMock).toHaveBeenCalledWith({
      customer: "cus_user1",
      items: [{ price: "price_pro_monthly" }],
      trial_period_days: 90,
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      payment_settings: { save_default_payment_method: "on_subscription" },
      metadata: { uid: "user-1" },
    }, { idempotencyKey: "trial-user-1" })
    expect(syncSubscriptionMock).toHaveBeenCalledWith("sub_trial")
  })

  it("is a no-op for a user who already has a live plan", async () => {
    getBillingMock.mockResolvedValue({ stripeCustomerId: "cus_user1", subscriptionId: "sub_1", status: "trialing" })
    const response = await POST(request({ plan: "pro" }))
    expect(response.status).toBe(200)
    expect(subscriptionsCreateMock).not.toHaveBeenCalled()
  })

  it.each([
    ["trial already used", { stripeCustomerId: "cus_user1", trialUsed: true, status: "canceled" }],
    ["previous subscription", { stripeCustomerId: "cus_user1", subscriptionId: "sub_old", status: "canceled" }],
  ])("returns 409 trial_used for a %s", async (_label, billing) => {
    getBillingMock.mockResolvedValue(billing)
    const response = await POST(request({ plan: "pro" }))
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: "trial_used" })
    expect(subscriptionsCreateMock).not.toHaveBeenCalled()
  })

  it("returns a generic error when Stripe fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    subscriptionsCreateMock.mockRejectedValue(new Error("No such price"))
    const response = await POST(request({ plan: "pro" }))
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "stripe_error" })
    expect(syncSubscriptionMock).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
