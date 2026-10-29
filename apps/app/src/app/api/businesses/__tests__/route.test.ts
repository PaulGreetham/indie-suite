import { beforeEach, describe, expect, it, vi } from "vitest"

const { getAdminAuthMock, getAdminDbMock, verifyIdTokenMock, getBillingMock, txGetMock, txCreateMock, whereMock, limitMock } = vi.hoisted(() => ({
  getAdminAuthMock: vi.fn(),
  getAdminDbMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
  getBillingMock: vi.fn(),
  txGetMock: vi.fn(),
  txCreateMock: vi.fn(),
  whereMock: vi.fn(),
  limitMock: vi.fn(),
}))

vi.mock("@/lib/firebase/admin", () => ({
  AdminFieldValue: { serverTimestamp: () => "server-timestamp" },
  getAdminAuth: getAdminAuthMock,
  getAdminDb: getAdminDbMock,
}))

vi.mock("@/lib/stripe/billing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe/billing")>()),
  getBilling: getBillingMock,
}))

import { POST } from "../route"

function request(body: unknown, token: string | null = "token") {
  return new Request("http://localhost/api/businesses", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  }) as never
}

function existingBusinesses(count: number) {
  txGetMock.mockResolvedValue({ size: count })
}

describe("businesses route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email_verified: true })
    getAdminAuthMock.mockReturnValue({ verifyIdToken: verifyIdTokenMock })
    getBillingMock.mockResolvedValue({ status: "trialing", plan: "pro" })
    const query = { where: whereMock, limit: limitMock }
    whereMock.mockReturnValue(query)
    limitMock.mockReturnValue(query)
    getAdminDbMock.mockReturnValue({
      collection: vi.fn(() => ({ where: whereMock, doc: vi.fn(() => ({ id: "biz-new" })) })),
      runTransaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({ get: txGetMock, create: txCreateMock })),
    })
    existingBusinesses(0)
  })

  it("returns 401 without a token", async () => {
    const res = await POST(request({ name: "Acme" }, null))
    expect(res.status).toBe(401)
    expect(txCreateMock).not.toHaveBeenCalled()
  })

  it("returns 402 without a live plan", async () => {
    getBillingMock.mockResolvedValue({ status: "canceled", plan: "pro" })
    const res = await POST(request({ name: "Acme" }))
    expect(res.status).toBe(402)
    expect(txCreateMock).not.toHaveBeenCalled()
  })

  it("returns 400 without a name", async () => {
    const res = await POST(request({ name: "   " }))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: "missing_name" })
  })

  it("creates an allow-listed business owned by the caller", async () => {
    const res = await POST(request({
      name: "  Acme Music ",
      city: "Leeds",
      emails: ["a@example.com", 5, ""],
      ownerId: "victim",
      firma: { workspaceId: "ws_victim" },
    }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ id: "biz-new" })
    expect(whereMock).toHaveBeenCalledWith("ownerId", "==", "user-1")
    const created = txCreateMock.mock.calls[0][1]
    expect(created).toMatchObject({ name: "Acme Music", city: "Leeds", emails: ["a@example.com"], ownerId: "user-1", createdAt: "server-timestamp" })
    expect(created).not.toHaveProperty("firma")
  })

  it.each([
    ["pro", 1],
    ["pro+", 3],
    ["pro++", 10],
    [null, 1],
  ])("enforces the %s limit of %i", async (plan, limit) => {
    getBillingMock.mockResolvedValue({ status: "active", plan })

    existingBusinesses(limit - 1)
    expect((await POST(request({ name: "Under" }))).status).toBe(200)

    existingBusinesses(limit)
    const res = await POST(request({ name: "Over" }))
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: "business_limit_reached" })
    expect(limitMock).toHaveBeenLastCalledWith(limit)
    expect(txCreateMock).toHaveBeenCalledTimes(1)
  })
})
