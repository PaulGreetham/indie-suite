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

  // Determine if user is new (no existing subscriptions for the customer)
  // New user gets a 30-day trial; existing customers do not.
  const customers = body.email ? await stripe.customers.list({ email: body.email, limit: 1 }) : { data: [] as Array<{ id: string }> }
  const customer = customers.data[0]
  const existingSubs = customer ? await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 1 }) : { data: [] as unknown[] }
  const isNewUser = !customer || (existingSubs.data.length === 0)
  const trialDays = isNewUser ? 30 : undefined

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    allow_promotion_codes: true,
    // Prefer attaching to existing customer to avoid duplicates
    ...(customer ? { customer: customer.id } : { customer_email: body.email }),
    line_items: [{ price: priceId, quantity: 1 }],
    ...(trialDays ? { subscription_data: { trial_period_days: trialDays } } : {}),
    success_url: `${baseUrl}/settings/subscriptions?checkout=success`,
    cancel_url: `${baseUrl}/settings/subscriptions?checkout=cancelled`,
  }).catch((err: unknown) => ({ error: String((err as Error)?.message || err) }))

  if ((session as { error?: string }).error) {
    return new Response(JSON.stringify({ error: "stripe_error", message: (session as { error: string }).error }), { status: 500 })
  }

  type SessionShape = { id: string; url?: string | null }
  const out = session as unknown as SessionShape
  return new Response(JSON.stringify({ id: out.id, url: out.url || null }), { status: 200 })
}


