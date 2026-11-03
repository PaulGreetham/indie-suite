import { getFirebaseAuth } from "@/lib/firebase/client"

export type SubscriptionInfo = {
  exists: boolean
  plan: string | null
  status: string | null
  customerId: string | null
  subscriptionId: string | null
  priceId: string | null
  active: boolean
  trialAvailable: boolean
}

async function authedPost(path: string, body?: unknown): Promise<Response> {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new Error("AUTH_REQUIRED")
  const send = async (forceRefresh: boolean) => fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${await user.getIdToken(forceRefresh)}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const res = await send(false)
  // A token issued before the email was verified keeps email_verified=false for up to an hour (SU-05).
  // Refresh it once and retry so a newly verified user isn't locked out.
  if (res.status === 403) {
    const data = (await res.clone().json().catch(() => null)) as { error?: string } | null
    if (data?.error === "email_unverified") return send(true)
  }
  return res
}

// The signed-in user's subscription, resolved server-side from their uid
export async function fetchSubscription(): Promise<SubscriptionInfo | null> {
  const res = await authedPost("/api/stripe/get-subscription")
  if (!res.ok) return null
  return (await res.json()) as SubscriptionInfo
}

// Redirects to the Stripe customer portal for the signed-in user. Returns false if no portal is available.
export async function openBillingPortal(): Promise<boolean> {
  const res = await authedPost("/api/stripe/create-portal-session")
  const data = (await res.json().catch(() => null)) as { url?: string } | null
  if (!res.ok || !data?.url) return false
  window.location.href = data.url
  return true
}

export type PlanChoice = { plan: string; interval: "monthly" | "yearly" }

// Redirects to Stripe Checkout, which collects a card and starts the free trial if the account is eligible.
// Returns false if checkout could not be started.
export async function startCheckout(choice: PlanChoice): Promise<boolean> {
  const res = await authedPost("/api/stripe/create-checkout-session", choice)
  const data = (await res.json().catch(() => null)) as { url?: string } | null
  if (!res.ok || !data?.url) return false
  window.location.href = data.url
  return true
}
