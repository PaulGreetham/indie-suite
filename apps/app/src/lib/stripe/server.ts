import Stripe from "stripe"

// Lazy singleton to avoid re-instantiation in dev
let stripeSingleton: Stripe | null = null

export function getStripeServer(): Stripe {
  if (!stripeSingleton) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY env var")
    }
    stripeSingleton = new Stripe(secretKey)
  }
  return stripeSingleton
}

// Map plan + billing interval to Stripe Price IDs from your dashboard.
// Set env vars for each:
// PRICE_PRO_MONTHLY, PRICE_PRO_YEARLY
// PRICE_PORTFOLIO_MONTHLY, PRICE_PORTFOLIO_YEARLY
// PRICE_AGENCY_MONTHLY, PRICE_AGENCY_YEARLY
export function getPriceIdForPlan(plan: string, interval: string = "monthly"): string | null {
  const normalized = plan.toLowerCase()
  const normalizedInterval = interval.toLowerCase() === "yearly" ? "yearly" : "monthly"
  switch (normalized) {
    case "pro":
      return normalizedInterval === "yearly"
        ? process.env.PRICE_PRO_YEARLY || null
        : process.env.PRICE_PRO_MONTHLY || process.env.PRICE_PRO || null
    case "pro+":
    case "pro-plus":
    case "pro_plus":
    case "portfolio":
      return normalizedInterval === "yearly"
        ? process.env.PRICE_PORTFOLIO_YEARLY || null
        : process.env.PRICE_PORTFOLIO_MONTHLY || process.env.PRICE_PRO_PLUS || null
    case "pro++":
    case "pro-plus-plus":
    case "pro_plus_plus":
    case "agency":
      return normalizedInterval === "yearly"
        ? process.env.PRICE_AGENCY_YEARLY || null
        : process.env.PRICE_AGENCY_MONTHLY || process.env.PRICE_PRO_PLUS_PLUS || null
    default:
      return null
  }
}

export function getAppBaseUrl(): string {
  // Prefer NEXT_PUBLIC_SITE_URL for Vercel, fallback to VERCEL_URL, then localhost
  const url = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || "http://localhost:3000"
  return url
}


