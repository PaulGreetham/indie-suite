import { NextRequest } from "next/server"
import { getStripeServer, getPriceIdForPlan, getAppBaseUrl } from "@/lib/stripe/server"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as null | { plan?: string; email?: string }
  if (!body?.plan) {
    return new Response(JSON.stringify({ error: "missing_plan" }), { status: 400 })
  }

  const priceId = getPriceIdForPlan(body.plan)
  if (!priceId) {
    return new Response(JSON.stringify({ error: "invalid_plan" }), { status: 400 })
  }

  const stripe = (() => {
    try { return getStripeServer() } catch { return null }
  })()
  if (!stripe) return new Response(JSON.stringify({ error: "server_config" }), { status: 500 })
  const baseUrl = getAppBaseUrl()

  // 30-day free trial
  const trialDays = 30

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    allow_promotion_codes: true,
    customer_email: body.email,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: trialDays },
    success_url: `${baseUrl}/dashboard/overview?checkout=success`,
    cancel_url: `${baseUrl}/signup?checkout=cancelled`,
  }).catch((err: unknown) => ({ error: String((err as Error)?.message || err) }))

  if ((session as { error?: string }).error) {
    return new Response(JSON.stringify({ error: "stripe_error", message: (session as { error: string }).error }), { status: 500 })
  }

  type SessionShape = { id: string; url?: string | null }
  const out = session as unknown as SessionShape
  return new Response(JSON.stringify({ id: out.id, url: out.url || null }), { status: 200 })
}


