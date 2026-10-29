import { NextRequest } from "next/server"
import { getStripeServer, getPriceIdForPlan, getAppBaseUrl } from "@/lib/stripe/server"
import { getBilling, getOrCreateStripeCustomer, isLiveSubscriptionStatus } from "@/lib/stripe/billing"
import { handleRouteError, jsonError, requireUser } from "@/lib/server/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    // Verified email required: no checkout or trial for unverified addresses (S-02)
    const { uid, email } = await requireUser(req)

    const body = await req.json().catch(() => null) as null | { plan?: string; interval?: string }
    if (!body?.plan) return jsonError("missing_plan", 400)

    const interval = body.interval === "yearly" ? "yearly" : "monthly"
    const priceId = getPriceIdForPlan(body.plan, interval)
    if (!priceId) return jsonError("invalid_plan", 400)

    const stripe = getStripeServer()
    const customerId = await getOrCreateStripeCustomer(uid, email)

    const billing = await getBilling(uid)
    // Plan changes go through the portal; a second checkout would create a second subscription
    if (isLiveSubscriptionStatus(billing?.status)) return jsonError("already_subscribed", 409)

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      allow_promotion_codes: true,
      customer: customerId,
      client_reference_id: uid,
      metadata: { uid },
      line_items: [{ price: priceId, quantity: 1 }],
      // No trial here: the free trial is started by /api/stripe/start-trial at signup
      subscription_data: { metadata: { uid } },
      success_url: `${getAppBaseUrl()}/settings/subscriptions?checkout=success`,
      cancel_url: `${getAppBaseUrl()}/settings/subscriptions?checkout=cancelled`,
    }).catch((err: unknown) => {
      console.error("/api/stripe/create-checkout-session stripe error:", (err as Error)?.message || err)
      return null
    })
    if (!session) return jsonError("stripe_error", 500)

    return new Response(JSON.stringify({ id: session.id, url: session.url || null }), { status: 200 })
  } catch (err) {
    return handleRouteError(err, "/api/stripe/create-checkout-session")
  }
}
