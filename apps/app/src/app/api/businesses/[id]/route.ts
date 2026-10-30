import { NextRequest } from "next/server"
import type { DocumentReference } from "firebase-admin/firestore"
import { AdminFieldValue, getAdminDb } from "@/lib/firebase/admin"
import { FIRMA_INTEGRATIONS_COLLECTION } from "@/lib/firma/provisioning"
import { HttpError, handleRouteError, loadOwned, requireActiveUser } from "@/lib/server/auth"
import { rateLimit } from "@/lib/server/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Records that belong to a business and are removed with it. Invoices are not: they may be tax records,
// so a business with invoices cannot be deleted (R-16).
const BUSINESS_RECORD_COLLECTIONS = ["customers", "venues", "events", "contracts", "settings_bank_accounts"]
// Firma has no workspace delete API, so workspaces of deleted businesses are queued for manual removal
const FIRMA_WORKSPACE_CLEANUP_COLLECTION = "firma_workspace_cleanup"
const BATCH_SIZE = 400

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await requireActiveUser(req)
    await rateLimit(uid, "write")
    const { id } = await params
    await loadOwned("settings_trading_details", id, uid)

    const db = getAdminDb()
    const invoices = await db.collection("invoices").where("ownerId", "==", uid).where("businessId", "==", id).limit(1).get()
    if (!invoices.empty) throw new HttpError(409, "business_has_invoices")

    const refs: DocumentReference[] = []
    for (const name of BUSINESS_RECORD_COLLECTIONS) {
      const snap = await db.collection(name).where("ownerId", "==", uid).where("businessId", "==", id).get()
      refs.push(...snap.docs.map((d) => d.ref))
    }
    for (let i = 0; i < refs.length; i += BATCH_SIZE) {
      const batch = db.batch()
      for (const ref of refs.slice(i, i + BATCH_SIZE)) batch.delete(ref)
      await batch.commit()
    }

    // The business doc goes last, so a partial failure can be retried by deleting again
    const integrationRef = db.collection(FIRMA_INTEGRATIONS_COLLECTION).doc(id)
    const workspaceId = (await integrationRef.get()).data()?.workspaceId
    const final = db.batch()
    if (typeof workspaceId === "string" && workspaceId) {
      final.set(db.collection(FIRMA_WORKSPACE_CLEANUP_COLLECTION).doc(workspaceId), {
        workspaceId, businessId: id, ownerId: uid, requestedAt: AdminFieldValue.serverTimestamp(),
      })
    }
    final.delete(integrationRef)
    final.delete(db.collection("settings_trading_details").doc(id))
    await final.commit()

    return new Response(JSON.stringify({ ok: true, deletedRecords: refs.length }), { status: 200 })
  } catch (err) {
    return handleRouteError(err, "/api/businesses/[id] DELETE")
  }
}
