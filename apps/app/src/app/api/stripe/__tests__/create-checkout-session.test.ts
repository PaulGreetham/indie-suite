import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const {
  getStripeServerMock,
  getPriceIdForPlanMock,
  getAppBaseUrlMock,
} = vi.hoisted(() => ({
  getStripeServerMock: vi.fn(),
  getPriceIdForPlanMock: vi.fn(),
  getAppBaseUrlMock: vi.fn(),
}))

vi.mock("@/lib/stripe/server", () => ({
  getStripeServer: getStripeServerMock,
  getPriceIdForPlan: getPriceIdForPlanMock,
  getAppBaseUrl: getAppBaseUrlMock,
}))

import { POST } from "../create-checkout-session/route"

describe("stripe create-checkout-session route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAppBaseUrlMock.mockReturnValue("https://app.example.com")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns 400 when plan is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/stripe/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({}),
      }) as never
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "missing_plan" })
  })

  it("returns 400 when the plan does not resolve to a price id", async () => {
    getPriceIdForPlanMock.mockReturnValue(null)

    const response = await POST(
      new Request("http://localhost/api/stripe/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ plan: "unknown" }),
      }) as never
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "invalid_plan" })
  })

  it("creates a checkout session with a trial for a new user", async () => {
    getPriceIdForPlanMock.mockReturnValue("price_pro_monthly")

    const customersList = vi.fn().mockResolvedValue({ data: [] })
    const sessionsCreate = vi.fn().mockResolvedValue({
      id: "cs_123",
      url: "https://checkout.stripe.com/session/cs_123",
    })

    getStripeServerMock.mockReturnValue({
      customers: { list: customersList },
      subscriptions: { list: vi.fn() },
      checkout: { sessions: { create: sessionsCreate } },
    })

    const response = await POST(
      new Request("http://localhost/api/stripe/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({
          plan: "pro",
          email: "user@example.com",
          interval: "monthly",
        }),
      }) as never
    )

    expect(getPriceIdForPlanMock).toHaveBeenCalledWith("pro", "monthly")
    expect(customersList).toHaveBeenCalledWith({
      email: "user@example.com",
      limit: 1,
    })
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer_email: "user@example.com",
        line_items: [{ price: "price_pro_monthly", quantity: 1 }],
        subscription_data: { trial_period_days: 30 },
        success_url:
          "https://app.example.com/settings/subscriptions?checkout=success",
        cancel_url:
          "https://app.example.com/settings/subscriptions?checkout=cancelled",
      })
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      id: "cs_123",
      url: "https://checkout.stripe.com/session/cs_123",
    })
  })
})
