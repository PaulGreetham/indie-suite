import { beforeEach, describe, expect, it, vi } from "vitest"

const { getAdminAuthMock, getAdminDbMock, getMock, verifyIdTokenMock } = vi.hoisted(() => ({
  getAdminAuthMock: vi.fn(),
  getAdminDbMock: vi.fn(),
  getMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
}))

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: getAdminAuthMock,
  getAdminDb: getAdminDbMock,
}))

import { GET } from "../list/route"

describe("contracts list route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email_verified: true })
    getAdminAuthMock.mockReturnValue({ verifyIdToken: verifyIdTokenMock })
  })

  it("returns 401 when no token is sent", async () => {
    const response = await GET(
      new Request("http://localhost/api/contracts/list") as never
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" })
    expect(getAdminDbMock).not.toHaveBeenCalled()
  })

  it("returns 500 when the contract query fails", async () => {
    const whereMock = vi.fn().mockReturnValue({ get: getMock })
    const collectionMock = vi.fn().mockReturnValue({ where: whereMock })
    getMock.mockRejectedValue(new Error("query failed"))
    getAdminDbMock.mockReturnValue({ collection: collectionMock })

    const response = await GET(
      new Request("http://localhost/api/contracts/list", {
        headers: { Authorization: "Bearer token" },
      }) as never
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "query_failed" })
  })

  it("returns mapped contract documents for the owner", async () => {
    const get = vi.fn().mockResolvedValue({
      docs: [
        { id: "contract-1", data: () => ({ ownerId: "user-1", title: "Main contract" }) },
      ],
    })
    const where = vi.fn().mockReturnValue({ get })
    const collection = vi.fn().mockReturnValue({ where })
    getAdminDbMock.mockReturnValue({ collection })

    const response = await GET(
      new Request("http://localhost/api/contracts/list", {
        headers: { Authorization: "Bearer token" },
      }) as never
    )

    expect(collection).toHaveBeenCalledWith("contracts")
    expect(where).toHaveBeenCalledWith("ownerId", "==", "user-1")
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      docs: [{ id: "contract-1", ownerId: "user-1", title: "Main contract" }],
    })
  })

  it("returns 403 when the email is not verified", async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email_verified: false })

    const response = await GET(
      new Request("http://localhost/api/contracts/list", {
        headers: { Authorization: "Bearer token" },
      }) as never
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: "email_unverified" })
    expect(getAdminDbMock).not.toHaveBeenCalled()
  })
})
