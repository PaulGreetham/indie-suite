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
} = vi.hoisted(() => ({
  getStripeServerMock: vi.fn(),
  getPriceIdForPlanMock: vi.fn(),
  getAppBaseUrlMock: vi.fn(),
  getAdminAuthMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
  getBillingMock: vi.fn(),
  getOrCreateStripeCustomerMock: vi.fn(),
  sessionsCreateMock: vi.fn(),
}))

vi.mock("@/lib/stripe/server", () => ({
  getStripeServer: getStripeServerMock,
  getPriceIdForPlan: getPriceIdForPlanMock,
  getAppBaseUrl: getAppBaseUrlMock,
}))

vi.mock("@/lib/stripe/billing", () => ({
  getBilling: getBillingMock,
  getOrCreateStripeCustomer: getOrCreateStripeCustomerMock,
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
    getStripeServerMock.mockReturnValue({ checkout: { sessions: { create: sessionsCreateMock } } })
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
      subscription_data: { metadata: { uid: "user-1" }, trial_period_days: 30 },
      success_url: "https://app.example.com/settings/subscriptions?checkout=success",
      cancel_url: "https://app.example.com/settings/subscriptions?checkout=cancelled",
    }))
    expect(sessionsCreateMock.mock.calls[0][0]).not.toHaveProperty("customer_email")
  })

  it.each([
    ["trial already used", { stripeCustomerId: "cus_user1", trialUsed: true }],
    ["existing subscription", { stripeCustomerId: "cus_user1", subscriptionId: "sub_1" }],
  ])("does not offer a trial when %s", async (_label, billing) => {
    getBillingMock.mockResolvedValue(billing)
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
