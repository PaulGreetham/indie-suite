import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { getStripeServerMock, constructEventMock, syncSubscriptionMock, getAdminDbMock, eventGetMock, eventSetMock, docMock } = vi.hoisted(() => ({
  getStripeServerMock: vi.fn(),
  constructEventMock: vi.fn(),
  syncSubscriptionMock: vi.fn(),
  getAdminDbMock: vi.fn(),
  eventGetMock: vi.fn(),
  eventSetMock: vi.fn(),
  docMock: vi.fn(),
}))

vi.mock("@/lib/stripe/server", () => ({
  getStripeServer: getStripeServerMock,
}))

vi.mock("@/lib/stripe/billing", () => ({
  syncSubscription: syncSubscriptionMock,
}))

vi.mock("@/lib/firebase/admin", () => ({
  AdminFieldValue: { serverTimestamp: () => "server-timestamp" },
  getAdminDb: getAdminDbMock,
}))

function signedRequest() {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig_123" },
    body: "payload",
  }) as never
}

import { POST } from "../webhook/route"

describe("stripe webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test")
    getStripeServerMock.mockReturnValue({
      webhooks: { constructEvent: constructEventMock },
    })
    eventGetMock.mockResolvedValue({ exists: false })
    eventSetMock.mockResolvedValue(undefined)
    syncSubscriptionMock.mockResolvedValue(undefined)
    docMock.mockReturnValue({ get: eventGetMock, set: eventSetMock })
    getAdminDbMock.mockReturnValue({ collection: vi.fn(() => ({ doc: docMock })) })
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

  it("ignores unrelated event types without touching Firestore", async () => {
    constructEventMock.mockReturnValue({ id: "evt_1", type: "invoice.paid", data: { object: {} } })

    const response = await POST(signedRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    expect(syncSubscriptionMock).not.toHaveBeenCalled()
    expect(getAdminDbMock).not.toHaveBeenCalled()
  })

  it.each([
    ["checkout.session.completed", { subscription: "sub_1" }],
    ["checkout.session.completed", { subscription: { id: "sub_1" } }],
    ["customer.subscription.created", { id: "sub_1" }],
    ["customer.subscription.updated", { id: "sub_1" }],
    ["customer.subscription.deleted", { id: "sub_1" }],
  ])("syncs the subscription for %s and records the event", async (type, object) => {
    constructEventMock.mockReturnValue({ id: "evt_1", type, data: { object } })

    const response = await POST(signedRequest())

    expect(response.status).toBe(200)
    expect(syncSubscriptionMock).toHaveBeenCalledWith("sub_1")
    expect(docMock).toHaveBeenCalledWith("evt_1")
    expect(eventSetMock).toHaveBeenCalledWith({ type, processedAt: "server-timestamp" })
  })

  it("skips events that were already processed", async () => {
    constructEventMock.mockReturnValue({ id: "evt_1", type: "customer.subscription.updated", data: { object: { id: "sub_1" } } })
    eventGetMock.mockResolvedValue({ exists: true })

    const response = await POST(signedRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true, duplicate: true })
    expect(syncSubscriptionMock).not.toHaveBeenCalled()
  })

  it("returns 500 and does not record the event when handling fails, so Stripe retries", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    constructEventMock.mockReturnValue({ id: "evt_1", type: "customer.subscription.updated", data: { object: { id: "sub_1" } } })
    syncSubscriptionMock.mockRejectedValue(new Error("firestore down"))

    const response = await POST(signedRequest())

    expect(response.status).toBe(500)
    expect(eventSetMock).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
