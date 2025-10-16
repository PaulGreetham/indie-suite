import { NextRequest } from "next/server"
import { getStripeServer, getAppBaseUrl } from "@/lib/stripe/server"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as null | { customerId?: string; email?: string }
  const stripe = getStripeServer()

  async function resolveCustomerId(): Promise<string | null> {
    if (body?.customerId) return String(body.customerId)
    const email = String(body?.email || "").trim().toLowerCase()
    if (!email) return null
    const customers = await stripe.customers.list({ email, limit: 1 })
    return customers.data[0]?.id || null
  }

  const customerId = await resolveCustomerId()
  if (!customerId) return new Response(JSON.stringify({ error: "missing_customer" }), { status: 400 })

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getAppBaseUrl()}/settings/subscriptions`,
  })

  return new Response(JSON.stringify({ url: session.url }), { status: 200 })
}


