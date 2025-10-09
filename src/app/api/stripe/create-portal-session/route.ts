import { NextRequest } from "next/server"
import { getStripeServer, getAppBaseUrl } from "@/lib/stripe/server"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as null | { customerId?: string }
  if (!body?.customerId) {
    return new Response(JSON.stringify({ error: "missing_customer_id" }), { status: 400 })
  }

  const stripe = getStripeServer()
  const session = await stripe.billingPortal.sessions.create({
    customer: body.customerId,
    return_url: `${getAppBaseUrl()}/settings/billing`,
  })

  return new Response(JSON.stringify({ url: session.url }), { status: 200 })
}


