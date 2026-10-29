import { NextRequest } from "next/server"
import { AdminFieldValue, getAdminDb } from "@/lib/firebase/admin"
import { parseInvoiceFields } from "@/lib/invoices/fields"
import { HttpError, handleRouteError, loadOwned, requireActiveUser } from "@/lib/server/auth"
import { assertOwnedInvoiceRefs, hasInvoiceNumber, invoiceNumberRef } from "@/lib/server/invoices"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Creates an invoice and reserves its number in one transaction, so numbers are unique per owner (R-14)
export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireActiveUser(req)
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const fields = parseInvoiceFields(body)
    await loadOwned("settings_trading_details", body?.businessId, uid)
    await assertOwnedInvoiceRefs(fields, uid)

    const db = getAdminDb()
    const invoiceRef = db.collection("invoices").doc()
    const now = AdminFieldValue.serverTimestamp()
    await db.runTransaction(async (tx) => {
      const numberRef = hasInvoiceNumber(fields.invoice_number) ? invoiceNumberRef(uid, fields.invoice_number) : null
      if (numberRef && (await tx.get(numberRef)).exists) throw new HttpError(409, "invoice_number_taken")
      tx.create(invoiceRef, {
        ...fields,
        ...(fields.status === "paid" ? { paidAt: now } : {}),
        ownerId: uid,
        businessId: body?.businessId,
        createdAt: now,
        updatedAt: now,
      })
      if (numberRef) tx.create(numberRef, { ownerId: uid, invoiceId: invoiceRef.id, invoice_number: fields.invoice_number })
    })
    return new Response(JSON.stringify({ id: invoiceRef.id }), { status: 200 })
  } catch (err) {
    return handleRouteError(err, "/api/invoices")
  }
}
