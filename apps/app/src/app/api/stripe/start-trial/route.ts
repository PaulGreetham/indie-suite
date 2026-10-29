import { NextRequest } from "next/server"
import { getStripeServer, getPriceIdForPlan } from "@/lib/stripe/server"
import { TRIAL_DAYS, getBilling, getOrCreateStripeCustomer, isLiveSubscriptionStatus, syncSubscription } from "@/lib/stripe/billing"
import { handleRouteError, jsonError, requireUser } from "@/lib/server/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Starts the free trial for a newly verified account without collecting a card.
// When the trial ends without a payment method, Stripe cancels the subscription.
export async function POST(req: NextRequest) {
  try {
    const { uid, email } = await requireUser(req)

    const body = await req.json().catch(() => null) as null | { plan?: string; interval?: string }
    if (!body?.plan) return jsonError("missing_plan", 400)
    const interval = body.interval === "yearly" ? "yearly" : "monthly"
    const priceId = getPriceIdForPlan(body.plan, interval)
    if (!priceId) return jsonError("invalid_plan", 400)

    const billing = await getBilling(uid)
    if (isLiveSubscriptionStatus(billing?.status)) return new Response(JSON.stringify({ ok: true }), { status: 200 })
    // One trial per uid; anyone who has had a subscription subscribes through checkout
    if (billing?.trialUsed || billing?.subscriptionId) return jsonError("trial_used", 409)

    const customerId = await getOrCreateStripeCustomer(uid, email)
    const subscription = await getStripeServer().subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: TRIAL_DAYS,
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      payment_settings: { save_default_payment_method: "on_subscription" },
      metadata: { uid },
    }, { idempotencyKey: `trial-${uid}` }).catch((err: unknown) => {
      console.error("/api/stripe/start-trial stripe error:", (err as Error)?.message || err)
      return null
    })
    if (!subscription) return jsonError("stripe_error", 500)

    // Record it now so access doesn't wait for the webhook
    await syncSubscription(subscription.id)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    return handleRouteError(err, "/api/stripe/start-trial")
  }
}
