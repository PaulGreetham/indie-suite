import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { HttpError } from "@/lib/server/auth"

// Per-user limits for routes that cost money or CPU (Chromium, Firma, Stripe) or write data (R-12, S-03)
export type RateLimitBucket = "pdf" | "firma" | "billing" | "write"

const LIMITS: Record<RateLimitBucket, { perMinute: number; perDay: number }> = {
  pdf: { perMinute: 10, perDay: 200 },
  firma: { perMinute: 10, perDay: 100 },
  billing: { perMinute: 5, perDay: 30 },
  write: { perMinute: 60, perDay: 2000 },
}

type Limiters = Record<RateLimitBucket, { minute: Ratelimit; day: Ratelimit }>

let limiters: Limiters | null | undefined
let warned = false

// Off (null) until UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set
function getLimiters(): Limiters | null {
  if (limiters !== undefined) return limiters
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    if (!warned && process.env.NODE_ENV === "production") {
      console.warn("rateLimit: UPSTASH_REDIS_REST_URL/TOKEN not set, rate limiting is disabled")
      warned = true
    }
    limiters = null
    return limiters
  }
  const redis = new Redis({ url, token })
  limiters = Object.fromEntries(
    Object.entries(LIMITS).map(([bucket, { perMinute, perDay }]) => [bucket, {
      minute: new Ratelimit({ redis, prefix: `rl:${bucket}:m`, limiter: Ratelimit.slidingWindow(perMinute, "1 m") }),
      day: new Ratelimit({ redis, prefix: `rl:${bucket}:d`, limiter: Ratelimit.fixedWindow(perDay, "1 d") }),
    }]),
  ) as Limiters
  return limiters
}

// Throws 429 rate_limited (with retryAfter seconds) when uid exceeds the bucket's per-minute or per-day limit.
// Fails open if Redis is unreachable so a Redis outage can't take the app down.
export async function rateLimit(uid: string, bucket: RateLimitBucket): Promise<void> {
  const limiter = getLimiters()?.[bucket]
  if (!limiter) return
  try {
    for (const window of [limiter.minute, limiter.day]) {
      const { success, reset } = await window.limit(uid)
      if (!success) throw new HttpError(429, "rate_limited", Math.max(1, Math.ceil((reset - Date.now()) / 1000)))
    }
  } catch (err) {
    if (err instanceof HttpError) throw err
    console.error("rateLimit: Redis error, allowing request:", err instanceof Error ? err.message : err)
  }
}

// Test hook: forget cached limiters so env changes take effect
export function resetRateLimitersForTests() {
  limiters = undefined
  warned = false
}
