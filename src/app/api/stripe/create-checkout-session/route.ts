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

  let stripe
  try {
    stripe = getStripeServer()
  } catch (err) {
    console.error("Stripe init error", err)
    return new Response(JSON.stringify({ error: "server_config", message: (err as Error).message }), { status: 500 })
  }
  const baseUrl = getAppBaseUrl()

  // 30-day free trial
  const trialDays = 30

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      allow_promotion_codes: true,
      customer_email: body.email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: trialDays,
      },
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/signup?checkout=cancelled`,
    })

    return new Response(JSON.stringify({ id: session.id, url: session.url }), { status: 200 })
  } catch (err) {
    console.error("Stripe session error", {
      message: (err as Error).message,
      plan: body.plan,
      priceId,
    })
    return new Response(JSON.stringify({ error: "stripe_error", message: (err as Error).message }), { status: 500 })
  }
}


