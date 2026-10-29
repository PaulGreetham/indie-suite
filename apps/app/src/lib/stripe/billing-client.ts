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
  const token = await user.getIdToken()
  return fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
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

// Starts the free trial (no card). Resolves to an error code on failure, e.g. "trial_used".
export async function startTrial(choice: PlanChoice): Promise<{ ok: boolean; error?: string }> {
  const res = await authedPost("/api/stripe/start-trial", choice)
  if (res.ok) return { ok: true }
  const data = (await res.json().catch(() => null)) as { error?: string } | null
  return { ok: false, error: data?.error || "trial_failed" }
}

// Redirects to Stripe Checkout to subscribe. Returns false if checkout could not be started.
export async function startCheckout(choice: PlanChoice): Promise<boolean> {
  const res = await authedPost("/api/stripe/create-checkout-session", choice)
  const data = (await res.json().catch(() => null)) as { url?: string } | null
  if (!res.ok || !data?.url) return false
  window.location.href = data.url
  return true
}
