import { NextRequest } from "next/server"
import type Stripe from "stripe"
import { AdminFieldValue, getAdminDb } from "@/lib/firebase/admin"
import { getStripeServer } from "@/lib/stripe/server"
import { syncSubscription } from "@/lib/stripe/billing"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Server-only record of processed event ids, so redelivered events are not handled twice
const EVENTS_COLLECTION = "stripe_events"

export async function POST(req: NextRequest) {
  const stripe = getStripeServer()
  const sig = req.headers.get("stripe-signature")
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) {
    return new Response("Webhook signature missing", { status: 400 })
  }

  const buf = Buffer.from(await req.arrayBuffer())
  const event = (() => {
    try { return stripe.webhooks.constructEvent(buf, sig, secret) } catch { return null }
  })()
  if (!event) return new Response("Webhook Error: invalid signature", { status: 400 })

  const subscriptionId = subscriptionIdFor(event)
  if (!subscriptionId) return new Response(JSON.stringify({ received: true }))

  const eventRef = getAdminDb().collection(EVENTS_COLLECTION).doc(event.id)
  if ((await eventRef.get()).exists) return new Response(JSON.stringify({ received: true, duplicate: true }))

  try {
    await syncSubscription(subscriptionId)
  } catch (err) {
    // 500 makes Stripe retry; the event is only recorded once handled
    console.error("stripe webhook handling failed:", event.type, event.id, err instanceof Error ? err.message : err)
    return new Response("Webhook handler failed", { status: 500 })
  }
  await eventRef.set({ type: event.type, processedAt: AdminFieldValue.serverTimestamp() })
  return new Response(JSON.stringify({ received: true }))
}

function subscriptionIdFor(event: Stripe.Event): string | null {
  switch (event.type) {
    case "checkout.session.completed": {
      const sub = event.data.object.subscription
      return typeof sub === "string" ? sub : sub?.id || null
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return event.data.object.id
    default:
      return null
  }
}
