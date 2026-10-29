import { AdminFieldValue, getAdminDb } from "@/lib/firebase/admin"
import { getPlanForPriceId, getStripeServer } from "./server"

// Server-only collection keyed by Firebase uid. Docs have no ownerId and the rules deny all client access.
// Stripe is linked to the uid, never to an email address (R-04, S-02).
export const BILLING_COLLECTION = "billing"

// Free trial length for new accounts; started server-side at signup without a card
export const TRIAL_DAYS = 90

export type BillingRecord = {
  stripeCustomerId?: string
  subscriptionId?: string | null
  status?: string | null
  plan?: string | null
  currentPeriodEnd?: number | null
  cancelAtPeriodEnd?: boolean
  trialUsed?: boolean
}

function billingRef(uid: string) {
  return getAdminDb().collection(BILLING_COLLECTION).doc(uid)
}

export async function getBilling(uid: string): Promise<BillingRecord | null> {
  const snap = await billingRef(uid).get()
  return snap.exists ? (snap.data() as BillingRecord) : null
}

// Returns the uid's stored Stripe customer, creating and storing one on first use
export async function getOrCreateStripeCustomer(uid: string, email: string | undefined): Promise<string> {
  const existing = await getBilling(uid)
  if (existing?.stripeCustomerId) return existing.stripeCustomerId

  // Idempotency key stops concurrent first checkouts creating duplicate customers
  const customer = await getStripeServer().customers.create(
    { email: email || undefined, metadata: { uid } },
    { idempotencyKey: `customer-${uid}` }
  )
  await billingRef(uid).set({
    stripeCustomerId: customer.id,
    createdAt: AdminFieldValue.serverTimestamp(),
    updatedAt: AdminFieldValue.serverTimestamp(),
  }, { merge: true })
  return customer.id
}

const LIVE_STATUSES = new Set(["active", "trialing", "past_due"])

export function isLiveSubscriptionStatus(status: string | null | undefined): boolean {
  return Boolean(status && LIVE_STATUSES.has(status))
}

// Re-reads a subscription from Stripe (so out-of-order events can't write stale state) and mirrors it
// into billing/{uid}. The uid comes from the customer we linked at checkout, never from event metadata.
export async function syncSubscription(subscriptionId: string): Promise<void> {
  const sub = await getStripeServer().subscriptions.retrieve(subscriptionId)
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id

  const linked = await getAdminDb().collection(BILLING_COLLECTION).where("stripeCustomerId", "==", customerId).limit(1).get()
  if (linked.empty) {
    console.warn("stripe webhook: subscription for unlinked customer ignored", { subscriptionId, customerId })
    return
  }
  const doc = linked.docs[0]
  const current = doc.data() as BillingRecord

  // Don't let events for another subscription overwrite a live one
  if (current.subscriptionId && current.subscriptionId !== sub.id && isLiveSubscriptionStatus(current.status)) return

  const item = sub.items.data[0]
  await doc.ref.set({
    subscriptionId: sub.id,
    status: sub.status,
    plan: getPlanForPriceId(item?.price?.id),
    currentPeriodEnd: item?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    ...(sub.trial_start || sub.trial_end ? { trialUsed: true } : {}),
    updatedAt: AdminFieldValue.serverTimestamp(),
  }, { merge: true })
}
