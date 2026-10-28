import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin"
import { pdfResponse, renderInvoicePdf, safePdfFilename } from "@/lib/pdf/render"
import { handleRouteError, loadOwned, loadOwnedOrNull, requireUser } from "@/lib/server/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await requireUser(req)
    const { id } = await params

    // Everything rendered is loaded server-side from docs the caller owns (R-03, S-01)
    const invoice = await loadOwned("invoices", id, uid)
    const payload: Record<string, unknown> = { ...invoice }
    if (!(invoice.include_payment_link && invoice.payment_link)) delete payload.payment_link
    if (!(invoice.include_notes && invoice.notes)) delete payload.notes

    if (!invoice.include_bank_account) {
      delete payload.bank_account
    } else {
      const bankAccount = invoice.bank_account_id
        ? await loadOwnedOrNull("settings_bank_accounts", invoice.bank_account_id, uid)
        : payload.bank_account ? null : await firstBankAccount(uid, invoice.businessId)
      if (bankAccount) payload.bank_account = bankAccount
    }

    if (!invoice.event_title && invoice.eventId) {
      const event = await loadOwnedOrNull("events", invoice.eventId, uid)
      if (event?.title) payload.event_title = event.title
    }

    const bytes = await renderInvoicePdf(payload, { engine: req.nextUrl.searchParams.get("engine") })
    return pdfResponse(bytes, safePdfFilename(invoice.invoice_number, "invoice"))
  } catch (err) {
    return handleRouteError(err, "/api/invoices/[id]/pdf")
  }
}

async function firstBankAccount(uid: string, businessId: unknown): Promise<Record<string, unknown> | null> {
  if (typeof businessId !== "string" || !businessId) return null
  const snap = await getAdminDb()
    .collection("settings_bank_accounts")
    .where("ownerId", "==", uid)
    .where("businessId", "==", businessId)
    .limit(1)
    .get()
  return snap.empty ? null : (snap.docs[0].data() as Record<string, unknown>)
}
