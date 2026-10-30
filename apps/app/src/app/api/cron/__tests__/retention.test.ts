import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { getAdminDbMock, eraseUserMock, whereMock, listUsersMock, getAllMock } = vi.hoisted(() => ({
  getAdminDbMock: vi.fn(),
  eraseUserMock: vi.fn(),
  whereMock: vi.fn(),
  listUsersMock: vi.fn(),
  getAllMock: vi.fn(),
}))

vi.mock("@/lib/firebase/admin", () => ({ getAdminDb: getAdminDbMock, getAdminAuth: () => ({ listUsers: listUsersMock }) }))
vi.mock("@/lib/server/erase-user", () => ({ eraseUser: eraseUserMock }))
vi.mock("@/lib/stripe/billing", () => ({
  BILLING_COLLECTION: "billing",
  isLiveSubscriptionStatus: (s: string | null | undefined) => ["active", "trialing", "past_due"].includes(String(s)),
}))

import { GET } from "../retention/route"

function call(token: string | null) {
  return GET(new NextRequest("http://localhost/api/cron/retention", { headers: token ? { Authorization: `Bearer ${token}` } : {} }))
}

const DAY_MS = 24 * 60 * 60 * 1000

// billing collection: endedAt query results, plus getAll() lookups for abandoned sign-up candidates
function billingDocs(docs: Array<{ id: string; status: string }>, billingByUid: Record<string, Record<string, unknown> | undefined> = {}) {
  const query = { limit: vi.fn(() => query), get: vi.fn(async () => ({ docs: docs.map((d) => ({ id: d.id, data: () => ({ status: d.status }) })) })) }
  whereMock.mockReturnValue(query)
  getAllMock.mockImplementation(async (...refs: Array<{ uid: string }>) => refs.map((r) => ({ data: () => billingByUid[r.uid] })))
  getAdminDbMock.mockReturnValue({
    collection: vi.fn(() => ({ where: whereMock, doc: (uid: string) => ({ uid }) })),
    getAll: getAllMock,
  })
}

function authUsers(users: Array<{ uid: string; emailVerified: boolean; ageDays: number }>) {
  listUsersMock.mockResolvedValue({
    users: users.map((u) => ({ uid: u.uid, emailVerified: u.emailVerified, metadata: { creationTime: new Date(Date.now() - u.ageDays * DAY_MS).toUTCString() } })),
    pageToken: undefined,
  })
}

describe("retention cron", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("CRON_SECRET", "cron-secret")
    eraseUserMock.mockResolvedValue({})
    authUsers([])
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([[null], ["wrong"]])("rejects a missing or wrong secret (%s)", async (token) => {
    billingDocs([])
    expect((await call(token)).status).toBe(401)
    expect(eraseUserMock).not.toHaveBeenCalled()
  })

  it("refuses every call when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "")
    billingDocs([])
    expect((await call("")).status).toBe(401)
  })

  it("erases accounts that ended over 12 months ago and skips any that are live again", async () => {
    billingDocs([{ id: "old-1", status: "canceled" }, { id: "back", status: "active" }, { id: "old-2", status: "canceled" }])
    const res = await call("cron-secret")
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ erased: 2, failed: 0, abandonedErased: 0, abandonedFailed: 0 })
    expect(eraseUserMock.mock.calls.map((c) => c[0])).toEqual(["old-1", "old-2"])
    const [field, op, cutoff] = whereMock.mock.calls[0]
    expect([field, op]).toEqual(["endedAt", "<"])
    expect(Math.floor(Date.now() / 1000) - (cutoff as number)).toBeGreaterThanOrEqual(365 * 24 * 60 * 60 - 5)
  })

  it("keeps going when one erase fails and caps each run at 10", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    billingDocs(Array.from({ length: 15 }, (_, i) => ({ id: `u${i}`, status: "canceled" })))
    eraseUserMock.mockRejectedValueOnce(new Error("boom"))
    const res = await call("cron-secret")
    await expect(res.json()).resolves.toEqual({ erased: 9, failed: 1, abandonedErased: 0, abandonedFailed: 0 })
    expect(eraseUserMock).toHaveBeenCalledTimes(10)
    spy.mockRestore()
  })

  it("erases abandoned sign-ups: unverified after 30 days, verified-but-never-subscribed after 12 months", async () => {
    billingDocs([], {
      "verified-old-stray-customer": { stripeCustomerId: "cus_x" },
      "verified-old-subscribed": { stripeCustomerId: "cus_y", subscriptionId: "sub_1", status: "active" },
    })
    authUsers([
      { uid: "unverified-old", emailVerified: false, ageDays: 31 },
      { uid: "unverified-new", emailVerified: false, ageDays: 10 },
      { uid: "verified-old", emailVerified: true, ageDays: 400 },
      { uid: "verified-old-stray-customer", emailVerified: true, ageDays: 400 },
      { uid: "verified-old-subscribed", emailVerified: true, ageDays: 400 },
      { uid: "verified-recent", emailVerified: true, ageDays: 200 },
    ])

    const res = await call("cron-secret")

    await expect(res.json()).resolves.toEqual({ erased: 0, failed: 0, abandonedErased: 3, abandonedFailed: 0 })
    expect(eraseUserMock.mock.calls.map((c) => c[0]).sort()).toEqual(["unverified-old", "verified-old", "verified-old-stray-customer"])
  })
})
