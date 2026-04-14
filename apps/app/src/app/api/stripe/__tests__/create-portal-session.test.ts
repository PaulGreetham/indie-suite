import { beforeEach, describe, expect, it, vi } from "vitest"

const { getStripeServerMock, getAppBaseUrlMock } = vi.hoisted(() => ({
  getStripeServerMock: vi.fn(),
  getAppBaseUrlMock: vi.fn(),
}))

vi.mock("@/lib/stripe/server", () => ({
  getStripeServer: getStripeServerMock,
  getAppBaseUrl: getAppBaseUrlMock,
}))

import { POST } from "../create-portal-session/route"

describe("stripe create-portal-session route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAppBaseUrlMock.mockReturnValue("https://app.example.com")
  })

  it("returns 400 when no customer can be resolved", async () => {
    getStripeServerMock.mockReturnValue({
      customers: { list: vi.fn().mockResolvedValue({ data: [] }) },
      billingPortal: { sessions: { create: vi.fn() } },
    })

    const response = await POST(
      new Request("http://localhost/api/stripe/create-portal-session", {
        method: "POST",
        body: JSON.stringify({}),
      }) as never
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "missing_customer" })
  })

  it("creates a billing portal session using the resolved customer id", async () => {
    const customersList = vi.fn().mockResolvedValue({
      data: [{ id: "cus_123" }],
    })
    const createSession = vi.fn().mockResolvedValue({
      url: "https://billing.stripe.com/session/portal_123",
    })

    getStripeServerMock.mockReturnValue({
      customers: { list: customersList },
      billingPortal: { sessions: { create: createSession } },
    })

    const response = await POST(
      new Request("http://localhost/api/stripe/create-portal-session", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }) as never
    )

    expect(customersList).toHaveBeenCalledWith({
      email: "user@example.com",
      limit: 1,
    })
    expect(createSession).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "https://app.example.com/settings/subscriptions",
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      url: "https://billing.stripe.com/session/portal_123",
    })
  })
})
