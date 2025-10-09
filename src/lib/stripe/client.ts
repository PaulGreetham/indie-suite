import { loadStripe, Stripe } from "@stripe/stripe-js"

let stripePromise: Promise<Stripe | null>

export function getStripeClient() {
  if (!stripePromise) {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!pk) {
      throw new Error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY env var")
    }
    stripePromise = loadStripe(pk)
  }
  return stripePromise
}


