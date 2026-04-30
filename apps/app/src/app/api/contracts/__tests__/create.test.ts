import { beforeEach, describe, expect, it, vi } from "vitest"

const { addMock, docGetMock, getAdminAuthMock, getAdminDbMock, verifyIdTokenMock } = vi.hoisted(() => ({
  addMock: vi.fn(),
  docGetMock: vi.fn(),
  getAdminAuthMock: vi.fn(),
  getAdminDbMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
}))

vi.mock("@/lib/firebase/admin", () => ({
  AdminFieldValue: { serverTimestamp: () => "server-timestamp" },
  getAdminAuth: getAdminAuthMock,
  getAdminDb: getAdminDbMock,
}))

import { POST } from "../create/route"

function request(body: unknown, token = "token"): Request {
  return new Request("http://localhost/api/contracts/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
}

describe("contracts create route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1" })
    getAdminAuthMock.mockReturnValue({ verifyIdToken: verifyIdTokenMock })
    addMock.mockResolvedValue({ id: "contract-1" })
    docGetMock.mockResolvedValue({
      exists: true,
      data: () => ({ ownerId: "user-1" }),
    })
    getAdminDbMock.mockReturnValue({
      collection: vi.fn((name: string) => {
        if (name === "events") return { doc: vi.fn(() => ({ get: docGetMock })) }
        return { add: addMock }
      }),
    })
  })

  it("creates a contract with the verified user as owner", async () => {
    const response = await POST(request({
      title: "Contract - Launch Party",
      eventId: "event-1",
      status: "draft",
      firmaId: "sr_1",
      recipients: [{ first_name: "Ada", email: "ada@example.com", designation: "Signer", order: 1 }],
    }) as never)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ id: "contract-1" })
    expect(addMock).toHaveBeenCalledWith(expect.objectContaining({
      title: "Contract - Launch Party",
      titleLower: "contract - launch party",
      ownerId: "user-1",
      firmaId: "sr_1",
      createdAt: "server-timestamp",
    }))
  })

  it("rejects contracts for events owned by another user", async () => {
    docGetMock.mockResolvedValue({
      exists: true,
      data: () => ({ ownerId: "user-2" }),
    })

    const response = await POST(request({ title: "Contract", eventId: "event-1" }) as never)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: "forbidden" })
    expect(addMock).not.toHaveBeenCalled()
  })
})
