import type { DocumentReference } from "firebase-admin/firestore"
import { AdminFieldValue, getAdminAuth, getAdminDb } from "@/lib/firebase/admin"
import { FIRMA_INTEGRATIONS_COLLECTION } from "@/lib/firma/provisioning"
import { BILLING_COLLECTION, type BillingRecord } from "@/lib/stripe/billing"
import { getStripeServer } from "@/lib/stripe/server"

// Everything a user owns (by ownerId). Firma workspaces can't be deleted via API, so they're queued.
const OWNED_COLLECTIONS = [
  "customers", "venues", "events", "invoices", "invoice_numbers", "contracts",
  "settings_bank_accounts", "settings_trading_details",
]
const FIRMA_WORKSPACE_CLEANUP_COLLECTION = "firma_workspace_cleanup"
const BATCH_SIZE = 400

export type EraseResult = { uid: string; deletedDocs: number; stripeCustomerDeleted: boolean; authUserDeleted: boolean }

function isNotFound(err: unknown): boolean {
  const e = err as { code?: string; errorInfo?: { code?: string }; statusCode?: number }
  return e?.code === "resource_missing" || e?.statusCode === 404 || e?.errorInfo?.code === "auth/user-not-found" || e?.code === "auth/user-not-found"
}

// Permanently erases a user (GDPR erasure / retention purge). Ordered so a failure part-way can be re-run:
// owned data first, then the Stripe customer, then billing (which holds the customer id), then the Auth user.
export async function eraseUser(uid: string): Promise<EraseResult> {
  if (!uid) throw new Error("uid required")
  const db = getAdminDb()

  const refs: DocumentReference[] = []
  for (const name of OWNED_COLLECTIONS) {
    const snap = await db.collection(name).where("ownerId", "==", uid).get()
    refs.push(...snap.docs.map((d) => d.ref))
  }

  // Firma integrations are keyed by business id and have no ownerId
  const businessIds = refs.filter((r) => r.path.startsWith("settings_trading_details/")).map((r) => r.id)
  const cleanup = db.batch()
  let hasCleanup = false
  for (const businessId of businessIds) {
    const integrationRef = db.collection(FIRMA_INTEGRATIONS_COLLECTION).doc(businessId)
    const workspaceId = (await integrationRef.get()).data()?.workspaceId
    if (typeof workspaceId === "string" && workspaceId) {
      cleanup.set(db.collection(FIRMA_WORKSPACE_CLEANUP_COLLECTION).doc(workspaceId), {
        workspaceId, businessId, ownerId: uid, reason: "account_erased", requestedAt: AdminFieldValue.serverTimestamp(),
      })
    }
    cleanup.delete(integrationRef)
    hasCleanup = true
  }
  if (hasCleanup) await cleanup.commit()

  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = db.batch()
    for (const ref of refs.slice(i, i + BATCH_SIZE)) batch.delete(ref)
    await batch.commit()
  }

  const billingRef = db.collection(BILLING_COLLECTION).doc(uid)
  const billing = (await billingRef.get()).data() as BillingRecord | undefined
  let stripeCustomerDeleted = false
  if (billing?.stripeCustomerId) {
    // Deleting the customer also cancels any subscription
    await getStripeServer().customers.del(billing.stripeCustomerId).catch((err: unknown) => {
      if (!isNotFound(err)) throw err
    })
    stripeCustomerDeleted = true
  }
  await billingRef.delete()

  let authUserDeleted = true
  await getAdminAuth().deleteUser(uid).catch((err: unknown) => {
    if (!isNotFound(err)) throw err
    authUserDeleted = false
  })

  return { uid, deletedDocs: refs.length, stripeCustomerDeleted, authUserDeleted }
}
