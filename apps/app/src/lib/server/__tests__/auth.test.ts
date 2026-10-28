import { beforeEach, describe, expect, it, vi } from "vitest"

const { getAdminAuthMock, getAdminDbMock, verifyIdTokenMock, getMock, docMock, collectionMock } = vi.hoisted(() => ({
  getAdminAuthMock: vi.fn(),
  getAdminDbMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
  getMock: vi.fn(),
  docMock: vi.fn(),
  collectionMock: vi.fn(),
}))

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: getAdminAuthMock,
  getAdminDb: getAdminDbMock,
}))

import { HttpError, handleRouteError, jsonError, loadOwned, requireUser } from "../auth"

function req(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/test", { headers })
}

describe("requireUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminAuthMock.mockReturnValue({ verifyIdToken: verifyIdTokenMock })
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email_verified: true })
  })

  it("rejects a missing token with 401 without calling Firebase", async () => {
    await expect(requireUser(req())).rejects.toMatchObject({ status: 401, code: "unauthorized" })
    expect(verifyIdTokenMock).not.toHaveBeenCalled()
  })

  it("rejects a non-Bearer header with 401", async () => {
    await expect(requireUser(req({ Authorization: "Basic abc" }))).rejects.toMatchObject({ status: 401 })
  })

  it("rejects an invalid or revoked token with 401", async () => {
    verifyIdTokenMock.mockRejectedValue(new Error("auth/id-token-revoked"))
    await expect(requireUser(req({ Authorization: "Bearer bad" }))).rejects.toMatchObject({ status: 401, code: "unauthorized" })
  })

  it("checks revocation when verifying", async () => {
    await requireUser(req({ Authorization: "Bearer good" }))
    expect(verifyIdTokenMock).toHaveBeenCalledWith("good", true)
  })

  it("rejects an unverified email with 403 by default", async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email_verified: false })
    await expect(requireUser(req({ Authorization: "Bearer t" }))).rejects.toMatchObject({ status: 403, code: "email_unverified" })
  })

  it("allows an unverified email when verifiedEmail is false", async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email_verified: false })
    await expect(requireUser(req({ Authorization: "Bearer t" }), { verifiedEmail: false })).resolves.toMatchObject({ uid: "user-1" })
  })

  it("returns the decoded token for a verified user", async () => {
    await expect(requireUser(req({ Authorization: "Bearer t" }))).resolves.toMatchObject({ uid: "user-1" })
  })
})

describe("loadOwned", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    docMock.mockReturnValue({ get: getMock })
    collectionMock.mockReturnValue({ doc: docMock })
    getAdminDbMock.mockReturnValue({ collection: collectionMock })
  })

  it("returns the document when the caller owns it", async () => {
    getMock.mockResolvedValue({ exists: true, id: "inv-1", data: () => ({ ownerId: "user-1", total: 10 }) })
    await expect(loadOwned("invoices", "inv-1", "user-1")).resolves.toEqual({ id: "inv-1", ownerId: "user-1", total: 10 })
    expect(collectionMock).toHaveBeenCalledWith("invoices")
    expect(docMock).toHaveBeenCalledWith("inv-1")
  })

  it("returns 404 for another user's document", async () => {
    getMock.mockResolvedValue({ exists: true, id: "inv-1", data: () => ({ ownerId: "user-2" }) })
    await expect(loadOwned("invoices", "inv-1", "user-1")).rejects.toMatchObject({ status: 404, code: "not_found" })
  })

  it("fails closed when ownerId is missing", async () => {
    getMock.mockResolvedValue({ exists: true, id: "inv-1", data: () => ({ total: 10 }) })
    await expect(loadOwned("invoices", "inv-1", "user-1")).rejects.toMatchObject({ status: 404 })
  })

  it("returns 404 when the document does not exist", async () => {
    getMock.mockResolvedValue({ exists: false, id: "inv-1", data: () => undefined })
    await expect(loadOwned("invoices", "inv-1", "user-1")).rejects.toMatchObject({ status: 404 })
  })

  it.each([undefined, null, "", "  ", 123])("returns 404 without querying for id %j", async (id) => {
    await expect(loadOwned("invoices", id, "user-1")).rejects.toMatchObject({ status: 404 })
    expect(getAdminDbMock).not.toHaveBeenCalled()
  })
})

describe("jsonError / handleRouteError", () => {
  it("builds a JSON error response", async () => {
    const res = jsonError("forbidden", 403)
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: "forbidden" })
  })

  it("maps HttpError to its status and code", async () => {
    const res = handleRouteError(new HttpError(404, "not_found"), "test")
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: "not_found" })
  })

  it("hides unknown error details behind a generic 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const res = handleRouteError(new Error("secret upstream detail"), "test")
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: "internal_error" })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
