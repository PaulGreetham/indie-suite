import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getAdminAuthMock,
  getAdminDbMock,
  verifyIdTokenMock,
  getFirmaClientMock,
  getSigningRequestMock,
  sendSigningRequestMock,
  updateSigningRequestRecipientMock,
} = vi.hoisted(() => ({
  getAdminAuthMock: vi.fn(),
  getAdminDbMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
  getFirmaClientMock: vi.fn(),
  getSigningRequestMock: vi.fn(),
  sendSigningRequestMock: vi.fn(),
  updateSigningRequestRecipientMock: vi.fn(),
}))

vi.mock("@/lib/firebase/admin", () => ({
  AdminFieldValue: { serverTimestamp: () => "server-timestamp" },
  getAdminAuth: getAdminAuthMock,
  getAdminDb: getAdminDbMock,
}))

vi.mock("@/lib/firma/server", () => ({
  getFirmaClient: getFirmaClientMock,
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
    process.env.FIREBASE_PROJECT_ID = "project"
    process.env.FIREBASE_CLIENT_EMAIL = "firebase@example.com"
    process.env.FIREBASE_PRIVATE_KEY = "private-key"
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1" })
    getAdminAuthMock.mockReturnValue({ verifyIdToken: verifyIdTokenMock })
    getSigningRequestMock.mockResolvedValue({ id: "sr_1" })
    sendSigningRequestMock.mockResolvedValue(undefined)
    updateSigningRequestRecipientMock.mockResolvedValue({})
    getFirmaClientMock.mockReturnValue({
      getSigningRequest: getSigningRequestMock,
      sendSigningRequest: sendSigningRequestMock,
      updateSigningRequestRecipient: updateSigningRequestRecipientMock,
    })
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

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: "forbidden" })
    expect(sendSigningRequestMock).not.toHaveBeenCalled()
  })

  it("sends the Firma id and updates local contract status", async () => {
    const { update } = mockContractDoc({ ownerId: "user-1", firmaId: "sr_1" })

    const response = await POST(request({ id: "contract-1" }) as never)

    expect(response.status).toBe(200)
    expect(getSigningRequestMock).toHaveBeenCalledWith("sr_1")
    expect(sendSigningRequestMock).toHaveBeenCalledWith("sr_1")
    expect(update).toHaveBeenCalledWith({ status: "sent", sentAt: "server-timestamp" })
  })

  it("repairs blank Firma template signers before retrying send", async () => {
    const { update } = mockContractDoc({
      ownerId: "user-1",
      firmaId: "sr_1",
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
})
