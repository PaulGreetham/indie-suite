import { NextRequest } from "next/server"
import { getStripeServer } from "@/lib/stripe/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const stripe = getStripeServer()
  const sig = req.headers.get("stripe-signature")
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) {
    return new Response("Webhook signature missing", { status: 400 })
  }

  const buf = Buffer.from(await req.arrayBuffer())
  const event = (() => {
    try { return stripe.webhooks.constructEvent(buf, sig, secret) } catch (err) { return null }
  })()
  if (!event) return new Response("Webhook Error: invalid signature", { status: 400 })

  // Handle relevant events (you can persist to Firestore if needed)
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "checkout.session.completed":
      // No-op for now
      break
    default:
      break
  }

  return new Response(JSON.stringify({ received: true }))
}


