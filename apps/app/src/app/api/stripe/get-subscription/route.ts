import { NextRequest } from "next/server"
import { getStripeServer, getPlanForPriceId } from "@/lib/stripe/server"
import { getBilling } from "@/lib/stripe/billing"
import { handleRouteError, requireUser } from "@/lib/server/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireUser(req)

    // Only the customer linked to this uid; never looked up by email (R-04, S-02)
    const customerId = (await getBilling(uid))?.stripeCustomerId
    if (!customerId) {
      return new Response(JSON.stringify({ exists: false, plan: null, status: null, customerId: null, subscriptionId: null, priceId: null }), { status: 200 })
    }

    // Find latest subscription (active or trialing preferred)
    const subs = await getStripeServer().subscriptions.list({ customer: customerId, status: "all", limit: 20 })
    const ordered = subs.data.sort((a, b) => Number(b.created) - Number(a.created))
    const preferred = ordered.find((s) => s.status === "active" || s.status === "trialing") || ordered[0]
    if (!preferred) {
      return new Response(JSON.stringify({ exists: true, plan: null, status: null, customerId, subscriptionId: null, priceId: null }), { status: 200 })
    }

    const priceId = preferred.items.data[0]?.price?.id || null
    return new Response(
      JSON.stringify({
        exists: true,
        plan: getPlanForPriceId(priceId),
        status: preferred.status,
        customerId,
        subscriptionId: preferred.id,
        priceId,
      }),
      { status: 200 },
    )
  } catch (err) {
    return handleRouteError(err, "/api/stripe/get-subscription")
  }
}
