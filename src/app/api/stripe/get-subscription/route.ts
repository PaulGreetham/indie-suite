import { NextRequest } from "next/server"
import { getStripeServer, getPriceIdForPlan } from "@/lib/stripe/server"

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as null | { email?: string }
  const email = String(body?.email || "").trim().toLowerCase()
  if (!email) return new Response(JSON.stringify({ error: "missing_email" }), { status: 400 })

  const stripe = (() => {
    try { return getStripeServer() } catch { return null }
  })()
  if (!stripe) return new Response(JSON.stringify({ error: "server_config" }), { status: 500 })

  // Find customer by email
  const customers = await stripe.customers.list({ email, limit: 1 })
  const customer = customers.data[0]
  if (!customer) {
    return new Response(JSON.stringify({ exists: false, plan: null, status: null, customerId: null, subscriptionId: null, priceId: null }), { status: 200 })
  }

  // Find latest subscription (active or trialing preferred)
  const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 20 })
  const ordered = subs.data.sort((a, b) => Number(b.created) - Number(a.created))
  const preferred = ordered.find((s) => s.status === "active" || s.status === "trialing") || ordered[0]
  if (!preferred) {
    return new Response(JSON.stringify({ exists: true, plan: null, status: null, customerId: customer.id, subscriptionId: null, priceId: null }), { status: 200 })
  }

  const item = preferred.items.data[0]
  const priceId = item?.price?.id || null

  function mapPriceToPlan(id: string | null): string | null {
    if (!id) return null
    const map: Record<string, string | null> = {
      [(process.env.PRICE_PRO || "")]: "pro",
      [(process.env.PRICE_PRO_PLUS || "")]: "pro+",
      [(process.env.PRICE_PRO_PLUS_PLUS || "")]: "pro++",
    }
    return map[id] || null
  }

  const plan = mapPriceToPlan(priceId)
  return new Response(
    JSON.stringify({
      exists: true,
      plan,
      status: preferred.status,
      customerId: customer.id,
      subscriptionId: preferred.id,
      priceId,
    }),
    { status: 200 },
  )
}


