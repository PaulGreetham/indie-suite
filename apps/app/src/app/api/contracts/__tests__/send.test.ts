import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getAdminAuthMock,
  getAdminDbMock,
  verifyIdTokenMock,
  getFirmaClientMock,
  getSigningRequestMock,
  sendSigningRequestMock,
  updateSigningRequestRecipientMock,
  getFirmaIntegrationMock,
  FirmaClientMock,
} = vi.hoisted(() => ({
  getAdminAuthMock: vi.fn(),
  getAdminDbMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
  getFirmaClientMock: vi.fn(),
  getSigningRequestMock: vi.fn(),
  sendSigningRequestMock: vi.fn(),
  updateSigningRequestRecipientMock: vi.fn(),
  getFirmaIntegrationMock: vi.fn(),
  FirmaClientMock: vi.fn(),
}))

vi.mock("@/lib/firebase/admin", () => ({
  AdminFieldValue: { serverTimestamp: () => "server-timestamp" },
  getAdminAuth: getAdminAuthMock,
  getAdminDb: getAdminDbMock,
}))

vi.mock("@/lib/firma/server", () => ({
  getFirmaClient: getFirmaClientMock,
  FirmaClient: FirmaClientMock,
}))

vi.mock("@/lib/firma/provisioning", () => ({
  getFirmaIntegrationForBusiness: getFirmaIntegrationMock,
}))


const { getBillingMock } = vi.hoisted(() => ({ getBillingMock: vi.fn() }))

vi.mock("@/lib/stripe/billing", () => ({
  getBilling: getBillingMock,
  isLiveSubscriptionStatus: (s: string | null | undefined) => ["active", "trialing", "past_due"].includes(String(s)),
}))

import { POST } from "../send/route"

function request(body: unknown): Request {
  return new Request("http://localhost/api/contracts/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer token",
    },
    body: JSON.stringify(body),
  })
}

function mockContractDoc(data: Record<string, unknown>) {
  const update = vi.fn().mockResolvedValue(undefined)
  const get = vi.fn().mockResolvedValue({
    exists: true,
    id: "contract-1",
    data: () => data,
  })
  const doc = vi.fn().mockReturnValue({ get, update })
  const collection = vi.fn().mockReturnValue({ doc })
  getAdminDbMock.mockReturnValue({ collection })
  return { collection, doc, get, update }
}

describe("contracts send route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBillingMock.mockResolvedValue({ status: "active" })
    process.env.FIREBASE_PROJECT_ID = "project"
    process.env.FIREBASE_CLIENT_EMAIL = "firebase@example.com"
    process.env.FIREBASE_PRIVATE_KEY = "private-key"
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email_verified: true })
    getAdminAuthMock.mockReturnValue({ verifyIdToken: verifyIdTokenMock })
    getSigningRequestMock.mockResolvedValue({ id: "sr_1" })
    sendSigningRequestMock.mockResolvedValue(undefined)
    updateSigningRequestRecipientMock.mockResolvedValue({})
    const client = {
      getSigningRequest: getSigningRequestMock,
      sendSigningRequest: sendSigningRequestMock,
      updateSigningRequestRecipient: updateSigningRequestRecipientMock,
    }
    getFirmaClientMock.mockReturnValue(client)
    FirmaClientMock.mockImplementation(function () { return client })
    getFirmaIntegrationMock.mockResolvedValue(null)
  })

  it("rejects contracts without a Firma signing request id", async () => {
    mockContractDoc({ ownerId: "user-1" })

    const response = await POST(request({ id: "contract-1" }) as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "missing_firmaId" })
    expect(sendSigningRequestMock).not.toHaveBeenCalled()
  })

  it("rejects users who do not own the contract", async () => {
    mockContractDoc({ ownerId: "user-2", firmaId: "sr_1" })

    const response = await POST(request({ id: "contract-1" }) as never)

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: "not_found" })
    expect(sendSigningRequestMock).not.toHaveBeenCalled()
  })

  it("rejects contracts with no ownerId (fails closed)", async () => {
    mockContractDoc({ firmaId: "sr_1" })

    const response = await POST(request({ id: "contract-1" }) as never)

    expect(response.status).toBe(404)
    expect(sendSigningRequestMock).not.toHaveBeenCalled()
  })

  it("returns a generic error when Firma rejects the send", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    mockContractDoc({ ownerId: "user-1", firmaId: "sr_1", firmaAccount: "company" })
    sendSigningRequestMock.mockRejectedValue(new Error("FIRMA_SEND_ERROR 500 internal upstream detail"))

    const response = await POST(request({ id: "contract-1" }) as never)

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({ error: "firma_send_failed" })
    spy.mockRestore()
  })

  it("sends the Firma id and updates local contract status", async () => {
    const { update } = mockContractDoc({ ownerId: "user-1", firmaId: "sr_1", firmaAccount: "company" })

    const response = await POST(request({ id: "contract-1" }) as never)

    expect(response.status).toBe(200)
    expect(sendSigningRequestMock).toHaveBeenCalledWith("sr_1")
    expect(update).toHaveBeenCalledWith({ status: "sent", sentAt: "server-timestamp" })
  })

  it("repairs blank Firma template signers before retrying send", async () => {
    const { update } = mockContractDoc({
      ownerId: "user-1",
      firmaId: "sr_1",
      firmaAccount: "company",
      recipients: [{
        first_name: "Ada",
        last_name: "Lovelace",
        email: "ada@example.com",
        designation: "Signer",
        order: 1,
      }],
    })
    sendSigningRequestMock
      .mockRejectedValueOnce(new Error('FIRMA_SEND_ERROR 400 POST url: {"error":"One or more signers are missing required information","validation_errors":[{"signer_id":"signer-1","missing_fields":["first_name","email"]}]}'))
      .mockResolvedValueOnce(undefined)

    const response = await POST(request({ id: "contract-1" }) as never)

    expect(response.status).toBe(200)
    expect(updateSigningRequestRecipientMock).toHaveBeenCalledWith("sr_1", {
      id: "signer-1",
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      designation: "Signer",
      order: 1,
    })
    expect(sendSigningRequestMock).toHaveBeenCalledTimes(2)
    expect(update).toHaveBeenCalledWith({ status: "sent", sentAt: "server-timestamp" })
  })

  it("sends workspace contracts with the business workspace key", async () => {
    getFirmaIntegrationMock.mockResolvedValue({ workspaceId: "ws_1", workspaceApiKey: "ws-key" })
    mockContractDoc({ ownerId: "user-1", firmaId: "sr_1", firmaAccount: "workspace", businessId: "biz-1" })

    const response = await POST(request({ id: "contract-1" }) as never)

    expect(response.status).toBe(200)
    expect(getFirmaIntegrationMock).toHaveBeenCalledWith("biz-1", "user-1")
    expect(FirmaClientMock).toHaveBeenCalledWith({ apiKey: "ws-key" })
    expect(getFirmaClientMock).not.toHaveBeenCalled()
  })

  it.each([
    ["workspace contract whose business has no integration", { firmaAccount: "workspace", businessId: "biz-1" }],
    ["legacy contract with no firmaAccount", { businessId: "biz-1" }],
    ["contract with no businessId", {}],
  ])("never falls back to the company key for a %s (R-11)", async (_label, extra) => {
    mockContractDoc({ ownerId: "user-1", firmaId: "sr_1", ...extra })

    const response = await POST(request({ id: "contract-1" }) as never)

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: "firma_workspace_unavailable" })
    expect(getFirmaClientMock).not.toHaveBeenCalled()
    expect(sendSigningRequestMock).not.toHaveBeenCalled()
  })
})
