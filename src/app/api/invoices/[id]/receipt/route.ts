import { NextRequest } from "next/server"
import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"
import { getAdminDb } from "@/lib/firebase/admin"
import { renderInvoiceHtml, formatInvoiceData } from "@/lib/pdf/invoice-template"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, context: { params?: { id?: string } }) {
  try {
    const id = context?.params?.id
    if (!id) return new Response(JSON.stringify({ error: "missing_id" }), { status: 400 })

    const db = getAdminDb()
    const snap = await db.collection("invoices").doc(id).get()
    if (!snap.exists) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 })
    const data = snap.data() as Record<string, unknown>

  // Force status paid and add a prominent paid banner date
    const updatedAt = (data as { updatedAt?: { toDate?: () => Date } | string }).updatedAt
    const paidAtStr = typeof updatedAt === "object" && updatedAt && "toDate" in updatedAt ? (updatedAt as { toDate: () => Date }).toDate().toISOString().slice(0,10) : (typeof updatedAt === "string" ? updatedAt : "")
    const payload = { ...data, status: "paid", paid_banner_date: paidAtStr }

  // Reuse the invoice renderer for now; include a large paid indicator via notes prepend
    const formatted = formatInvoiceData(payload)
    // Use template flags instead of brittle string replacements
    const html = renderInvoiceHtml({ ...formatted, is_receipt: true })

    const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production"
    let browser
    if (isProd) {
      const exePath = await chromium.executablePath()
      browser = await puppeteer.launch({ args: chromium.args, defaultViewport: chromium.defaultViewport, executablePath: exePath || undefined, headless: true })
    } else {
      browser = await puppeteer.launch({ channel: "chrome", headless: true })
    }
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "load" })
    const pdf = await page.pdf({ format: "A4", printBackground: true })
    await browser.close()

    const buf = Buffer.from(pdf)
    const invoiceNum = (data as { invoice_number?: string }).invoice_number || "receipt"
    return new Response(buf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=${invoiceNum}-receipt.pdf` } })
  } catch (e) {
    return new Response(JSON.stringify({ error: "internal_error", message: (e as Error).message }), { status: 500 })
  }
}


