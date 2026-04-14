import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { getStripeServerMock } = vi.hoisted(() => ({
  getStripeServerMock: vi.fn(),
}))

vi.mock("@/lib/stripe/server", () => ({
  getStripeServer: getStripeServerMock,
  getPriceIdForPlan: vi.fn(),
}))

import { POST } from "../get-subscription/route"

describe("stripe get-subscription route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns 400 when email is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/stripe/get-subscription", {
        method: "POST",
        body: JSON.stringify({}),
      }) as never
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "missing_email" })
  })

  it("returns an empty subscription payload when no customer exists", async () => {
    getStripeServerMock.mockReturnValue({
      customers: { list: vi.fn().mockResolvedValue({ data: [] }) },
    })

    const response = await POST(
      new Request("http://localhost/api/stripe/get-subscription", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }) as never
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      exists: false,
      plan: null,
      status: null,
      customerId: null,
      subscriptionId: null,
      priceId: null,
    })
  })

  it("prefers active subscriptions and maps the returned price to a plan", async () => {
    vi.stubEnv("PRICE_PRO_MONTHLY", "price_pro_monthly")

    const customersList = vi.fn().mockResolvedValue({
      data: [{ id: "cus_123" }],
    })
    const subscriptionsList = vi.fn().mockResolvedValue({
      data: [
        {
          id: "sub_old",
          created: 100,
          status: "canceled",
          items: { data: [{ price: { id: "old_price" } }] },
        },
        {
          id: "sub_active",
          created: 200,
          status: "active",
          items: { data: [{ price: { id: "price_pro_monthly" } }] },
        },
      ],
    })

    getStripeServerMock.mockReturnValue({
      customers: { list: customersList },
      subscriptions: { list: subscriptionsList },
    })

    const response = await POST(
      new Request("http://localhost/api/stripe/get-subscription", {
        method: "POST",
        body: JSON.stringify({ email: "User@Example.com " }),
      }) as never
    )

    expect(customersList).toHaveBeenCalledWith({
      email: "user@example.com",
      limit: 1,
    })
    expect(subscriptionsList).toHaveBeenCalledWith({
      customer: "cus_123",
      status: "all",
      limit: 20,
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      exists: true,
      plan: "pro",
      status: "active",
      customerId: "cus_123",
      subscriptionId: "sub_active",
      priceId: "price_pro_monthly",
    })
  })
})
