import { NextRequest } from "next/server"
import type { Transaction } from "firebase-admin/firestore"
import { AdminFieldValue, getAdminDb } from "@/lib/firebase/admin"
import { parseInvoiceFields } from "@/lib/invoices/fields"
import { HttpError, handleRouteError, requireActiveUser } from "@/lib/server/auth"
import { rateLimit } from "@/lib/server/rate-limit"
import { assertOwnedInvoiceRefs, hasInvoiceNumber, invoiceNumberRef } from "@/lib/server/invoices"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

async function loadInvoiceInTx(tx: Transaction, id: string, uid: string) {
  const ref = getAdminDb().collection("invoices").doc(id)
  const snap = await tx.get(ref)
  const data = snap.exists ? (snap.data() as Record<string, unknown>) : null
  if (!data || data.ownerId !== uid) throw new HttpError(404, "not_found")
  return { ref, data }
}

// Updates an invoice. A number change swaps its reservation; paidAt is set when the status becomes paid (R-14)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { uid } = await requireActiveUser(req)
    await rateLimit(uid, "write")
    const { id } = await params
    const fields = parseInvoiceFields(await req.json().catch(() => null))
    await assertOwnedInvoiceRefs(fields, uid)

    await getAdminDb().runTransaction(async (tx) => {
      const { ref, data } = await loadInvoiceInTx(tx, id, uid)
      const oldNumber = hasInvoiceNumber(data.invoice_number) ? data.invoice_number.trim() : null
      const newNumber = "invoice_number" in fields ? (hasInvoiceNumber(fields.invoice_number) ? fields.invoice_number.trim() : null) : oldNumber
      const numberChanged = newNumber !== oldNumber
      if (numberChanged && newNumber) {
        const taken = await tx.get(invoiceNumberRef(uid, newNumber))
        if (taken.exists && taken.data()?.invoiceId !== id) throw new HttpError(409, "invoice_number_taken")
      }

      const update: Record<string, unknown> = { ...fields, updatedAt: AdminFieldValue.serverTimestamp() }
      if ("status" in fields && fields.status !== data.status) {
        update.paidAt = fields.status === "paid" ? AdminFieldValue.serverTimestamp() : null
      }
      tx.update(ref, update)
      if (numberChanged) {
        if (oldNumber) tx.delete(invoiceNumberRef(uid, oldNumber))
        if (newNumber) tx.set(invoiceNumberRef(uid, newNumber), { ownerId: uid, invoiceId: id, invoice_number: newNumber })
      }
    })
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    return handleRouteError(err, "/api/invoices/[id] PATCH")
  }
}

// Deletes an invoice and releases its number
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { uid } = await requireActiveUser(req)
    await rateLimit(uid, "write")
    const { id } = await params
    await getAdminDb().runTransaction(async (tx) => {
      const { ref, data } = await loadInvoiceInTx(tx, id, uid)
      tx.delete(ref)
      if (hasInvoiceNumber(data.invoice_number)) tx.delete(invoiceNumberRef(uid, data.invoice_number))
    })
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    return handleRouteError(err, "/api/invoices/[id] DELETE")
  }
}
