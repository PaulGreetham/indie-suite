import { NextRequest } from "next/server"
import { getStripeServer, getAppBaseUrl } from "@/lib/stripe/server"
import { getBilling } from "@/lib/stripe/billing"
import { handleRouteError, jsonError, requireUser } from "@/lib/server/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireUser(req)

    // Only the customer linked to this uid; client-supplied customerId/email are ignored (R-04)
    const customerId = (await getBilling(uid))?.stripeCustomerId
    if (!customerId) return jsonError("missing_customer", 400)

    const session = await getStripeServer().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getAppBaseUrl()}/settings/subscriptions`,
    })

    return new Response(JSON.stringify({ url: session.url }), { status: 200 })
  } catch (err) {
    return handleRouteError(err, "/api/stripe/create-portal-session")
  }
}
