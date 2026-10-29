import { beforeEach, describe, expect, it, vi } from "vitest"

const { getStripeServerMock, getAppBaseUrlMock, getAdminAuthMock, verifyIdTokenMock, getBillingMock, portalCreateMock, customersListMock } = vi.hoisted(() => ({
  getStripeServerMock: vi.fn(),
  getAppBaseUrlMock: vi.fn(),
  getAdminAuthMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
  getBillingMock: vi.fn(),
  portalCreateMock: vi.fn(),
  customersListMock: vi.fn(),
}))

vi.mock("@/lib/stripe/server", () => ({
  getStripeServer: getStripeServerMock,
  getAppBaseUrl: getAppBaseUrlMock,
}))

vi.mock("@/lib/stripe/billing", () => ({
  getBilling: getBillingMock,
}))

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: getAdminAuthMock,
  getAdminDb: vi.fn(),
}))

import { POST } from "../create-portal-session/route"

function request(body: unknown = {}, token: string | null = "token") {
  return new Request("http://localhost/api/stripe/create-portal-session", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  }) as never
}

describe("stripe create-portal-session route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAppBaseUrlMock.mockReturnValue("https://app.example.com")
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email_verified: true })
    getAdminAuthMock.mockReturnValue({ verifyIdToken: verifyIdTokenMock })
    portalCreateMock.mockResolvedValue({ url: "https://billing.stripe.com/session" })
    getStripeServerMock.mockReturnValue({
      billingPortal: { sessions: { create: portalCreateMock } },
      customers: { list: customersListMock },
    })
  })

  it("returns 401 without a token", async () => {
    const response = await POST(request({ customerId: "cus_victim" }, null))
    expect(response.status).toBe(401)
    expect(portalCreateMock).not.toHaveBeenCalled()
  })

  it("returns 400 when the uid has no linked customer", async () => {
    getBillingMock.mockResolvedValue(null)

    const response = await POST(request({ email: "victim@example.com" }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "missing_customer" })
    expect(customersListMock).not.toHaveBeenCalled()
    expect(portalCreateMock).not.toHaveBeenCalled()
  })

  it("opens the portal for the uid's stored customer and ignores client customerId/email (R-04)", async () => {
    getBillingMock.mockResolvedValue({ stripeCustomerId: "cus_user1" })

    const response = await POST(request({ customerId: "cus_victim", email: "victim@example.com" }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ url: "https://billing.stripe.com/session" })
    expect(getBillingMock).toHaveBeenCalledWith("user-1")
    expect(portalCreateMock).toHaveBeenCalledWith({
      customer: "cus_user1",
      return_url: "https://app.example.com/settings/subscriptions",
    })
  })
})
