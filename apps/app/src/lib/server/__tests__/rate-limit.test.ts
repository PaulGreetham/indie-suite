import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { limitMock, ratelimitCtor } = vi.hoisted(() => ({
  limitMock: vi.fn(),
  ratelimitCtor: vi.fn(),
}))

vi.mock("@upstash/redis", () => ({ Redis: class {} }))
vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow = vi.fn((n: number, w: string) => ({ n, w, kind: "sliding" }))
    static fixedWindow = vi.fn((n: number, w: string) => ({ n, w, kind: "fixed" }))
    prefix: string
    constructor(opts: { prefix: string }) {
      this.prefix = opts.prefix
      ratelimitCtor(opts)
    }
    limit(id: string) {
      return limitMock(this.prefix, id)
    }
  }
  return { Ratelimit }
})

vi.mock("@/lib/firebase/admin", () => ({ getAdminAuth: vi.fn(), getAdminDb: vi.fn() }))
vi.mock("@/lib/stripe/billing", () => ({ getBilling: vi.fn(), isLiveSubscriptionStatus: vi.fn() }))

import { rateLimit, resetRateLimitersForTests } from "../rate-limit"

describe("rateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimitersForTests()
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token")
    limitMock.mockResolvedValue({ success: true, reset: Date.now() + 30_000 })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("is a no-op when Upstash is not configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
    resetRateLimitersForTests()
    await expect(rateLimit("user-1", "pdf")).resolves.toBeUndefined()
    expect(limitMock).not.toHaveBeenCalled()
  })

  it("checks the per-minute and per-day windows for the user and bucket", async () => {
    await rateLimit("user-1", "pdf")
    expect(limitMock).toHaveBeenCalledWith("rl:pdf:m", "user-1")
    expect(limitMock).toHaveBeenCalledWith("rl:pdf:d", "user-1")
  })

  it("throws 429 with retryAfter when the minute window is exhausted", async () => {
    limitMock.mockResolvedValueOnce({ success: false, reset: Date.now() + 42_000 })
    await expect(rateLimit("user-1", "firma")).rejects.toMatchObject({ status: 429, code: "rate_limited" })
    limitMock.mockResolvedValueOnce({ success: false, reset: Date.now() + 42_000 })
    const err = await rateLimit("user-1", "firma").catch((e) => e)
    expect(err.retryAfter).toBeGreaterThanOrEqual(41)
    expect(err.retryAfter).toBeLessThanOrEqual(42)
  })

  it("throws 429 when the daily cap is reached", async () => {
    limitMock.mockImplementation(async (prefix: string) => ({ success: !prefix.endsWith(":d"), reset: Date.now() + 3_600_000 }))
    await expect(rateLimit("user-1", "billing")).rejects.toMatchObject({ status: 429 })
  })

  it("fails open when Redis is unreachable", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    limitMock.mockRejectedValue(new Error("ECONNREFUSED"))
    await expect(rateLimit("user-1", "write")).resolves.toBeUndefined()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
