import { NextRequest } from "next/server"
import { pdfResponse, renderInvoicePdf, safePdfFilename } from "@/lib/pdf/render"
import { handleRouteError, loadOwned, requireActiveUser } from "@/lib/server/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await requireActiveUser(req)
    const { id } = await params

    const invoice = await loadOwned("invoices", id, uid)
    const bytes = await renderInvoicePdf({ ...invoice, status: "paid" }, { engine: req.nextUrl.searchParams.get("engine") })
    return pdfResponse(bytes, safePdfFilename(invoice.invoice_number ? `${invoice.invoice_number}-receipt` : "", "receipt"))
  } catch (err) {
    return handleRouteError(err, "/api/invoices/[id]/receipt")
  }
}
