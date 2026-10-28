import { AdminFieldValue, getAdminDb } from "@/lib/firebase/admin"
import { getStripeServer } from "./server"

// Server-only collection keyed by Firebase uid. Docs have no ownerId and the rules deny all client access.
// Stripe is linked to the uid, never to an email address (R-04, S-02).
export const BILLING_COLLECTION = "billing"

export type BillingRecord = {
  stripeCustomerId?: string
  subscriptionId?: string | null
  status?: string | null
  plan?: string | null
  currentPeriodEnd?: number | null
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
