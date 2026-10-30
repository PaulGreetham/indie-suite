import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { eraseUserMock } = vi.hoisted(() => ({ eraseUserMock: vi.fn() }))

vi.mock("@/lib/firebase/admin", () => ({ getAdminDb: vi.fn(), getAdminAuth: vi.fn() }))
vi.mock("@/lib/server/erase-user", () => ({ eraseUser: eraseUserMock }))

import { POST } from "../erase-user/route"

function call(body: unknown, token: string | null = "admin-secret") {
  return POST(new NextRequest("http://localhost/api/admin/erase-user", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  }))
}

describe("admin erase-user", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("ADMIN_API_SECRET", "admin-secret")
    eraseUserMock.mockResolvedValue({ uid: "user-1", deletedDocs: 3, stripeCustomerDeleted: true, authUserDeleted: true })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("requires the admin secret", async () => {
    expect((await call({ uid: "user-1", confirm: "user-1" }, null)).status).toBe(401)
    expect((await call({ uid: "user-1", confirm: "user-1" }, "nope")).status).toBe(401)
    expect(eraseUserMock).not.toHaveBeenCalled()
  })

  it("requires the uid to be confirmed", async () => {
    const res = await call({ uid: "user-1", confirm: "user-2" })
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: "confirmation_mismatch" })
    expect(eraseUserMock).not.toHaveBeenCalled()
  })

  it("erases the confirmed user", async () => {
    const res = await call({ uid: "user-1", confirm: "user-1" })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ uid: "user-1", deletedDocs: 3 })
    expect(eraseUserMock).toHaveBeenCalledWith("user-1")
  })
})
