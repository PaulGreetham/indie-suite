import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { getStripeServerMock, constructEventMock } = vi.hoisted(() => ({
  getStripeServerMock: vi.fn(),
  constructEventMock: vi.fn(),
}))

vi.mock("@/lib/stripe/server", () => ({
  getStripeServer: getStripeServerMock,
}))

import { POST } from "../webhook/route"

describe("stripe webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test")
    getStripeServerMock.mockReturnValue({
      webhooks: { constructEvent: constructEventMock },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns 400 when the signature header is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: "payload",
      }) as never
    )

    expect(response.status).toBe(400)
    await expect(response.text()).resolves.toBe("Webhook signature missing")
  })

  it("returns 400 when the signature is invalid", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("invalid")
    })

    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "sig_123" },
        body: "payload",
      }) as never
    )

    expect(response.status).toBe(400)
    await expect(response.text()).resolves.toBe("Webhook Error: invalid signature")
  })

  it("accepts a valid webhook payload", async () => {
    constructEventMock.mockReturnValue({ type: "checkout.session.completed" })

    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "sig_123" },
        body: "payload",
      }) as never
    )

    expect(constructEventMock).toHaveBeenCalled()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
  })
})
