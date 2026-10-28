import { getFirebaseAuth } from "@/lib/firebase/client"

export type SubscriptionInfo = {
  exists: boolean
  plan: string | null
  status: string | null
  customerId: string | null
  subscriptionId: string | null
  priceId: string | null
}

async function authedPost(path: string): Promise<Response> {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new Error("AUTH_REQUIRED")
  const token = await user.getIdToken()
  return fetch(path, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
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
