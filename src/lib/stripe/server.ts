import Stripe from "stripe"

// Lazy singleton to avoid re-instantiation in dev
let stripeSingleton: Stripe | null = null

export function getStripeServer(): Stripe {
  if (!stripeSingleton) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY env var")
    }
    stripeSingleton = new Stripe(secretKey, {
      apiVersion: "2024-06-20",
    })
  }
  return stripeSingleton
}

// Map plan slugs used in the app to Stripe Price IDs from your dashboard
// Set env vars for each: PRICE_PRO, PRICE_PRO_PLUS, PRICE_PRO_PLUS_PLUS
export function getPriceIdForPlan(plan: string): string | null {
  const normalized = plan.toLowerCase()
  switch (normalized) {
    case "pro":
      return process.env.PRICE_PRO || null
    case "pro+":
    case "pro-plus":
    case "pro_plus":
      return process.env.PRICE_PRO_PLUS || null
    case "pro++":
    case "pro-plus-plus":
    case "pro_plus_plus":
      return process.env.PRICE_PRO_PLUS_PLUS || null
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


