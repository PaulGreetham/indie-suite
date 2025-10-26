import { NextRequest } from "next/server"
import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"
import { getAdminDb } from "@/lib/firebase/admin"
import { renderInvoiceHtml, formatInvoiceData } from "@/lib/pdf/invoice-template"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!id) return new Response(JSON.stringify({ error: "missing_id" }), { status: 400 })

    // Fetch invoice and optional bank account on the server using Admin SDK
    const db = getAdminDb()
    const snap = await db.collection("invoices").doc(id).get()
    if (!snap.exists) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 })
    const data = snap.data() as Record<string, unknown>

    // Conditionally enrich with bank account
    const includeBank = Boolean((data as { include_bank_account?: boolean }).include_bank_account)
    const bankId = (data as { bank_account_id?: string }).bank_account_id
    if (includeBank && bankId) {
      const ba = await db.collection("settings_bank_accounts").doc(String(bankId)).get().catch(() => null)
      if (ba?.exists) (data as Record<string, unknown>).bank_account = ba.data() as Record<string, unknown>
    }

    // Switch-controlled content
    if (!Boolean((data as { include_payment_link?: boolean }).include_payment_link)) delete (data as Record<string, unknown>).payment_link
    if (!Boolean((data as { include_notes?: boolean }).include_notes)) delete (data as Record<string, unknown>).notes
    if (!includeBank) delete (data as Record<string, unknown>).bank_account

    const html = renderInvoiceHtml(formatInvoiceData(data))

    const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production"
    let browser
    if (isProd) {
      const remoteExec = process.env.CHROMIUM_REMOTE_EXEC_PATH
      const exePath = await chromium.executablePath(remoteExec)
      browser = await puppeteer.launch({ args: chromium.args, defaultViewport: chromium.defaultViewport, executablePath: exePath || undefined, headless: true })
    } else {
      browser = await puppeteer.launch({ channel: "chrome", headless: true })
    }
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "load" })
    const pdf = await page.pdf({ format: "A4", printBackground: true })
    await page.close().catch(() => void 0)
    await browser.close().catch(() => void 0)

    const buf = Buffer.from(pdf)
    const invoiceNum = (data as { invoice_number?: string }).invoice_number || "invoice"
    return new Response(buf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=${invoiceNum}.pdf` } })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("/api/invoices/[id]/pdf error:", message)
    return new Response(JSON.stringify({ error: "pdf_failed", message }), { status: 500 })
  }
}
