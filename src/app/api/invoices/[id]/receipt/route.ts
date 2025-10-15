import { NextRequest } from "next/server"
import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"
import { getAdminDb } from "@/lib/firebase/admin"
import { renderInvoiceHtml, formatInvoiceData } from "@/lib/pdf/invoice-template"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return new Response(JSON.stringify({ error: "missing_id" }), { status: 400 })

  const db = getAdminDb()
  const snap = await db.collection("invoices").doc(id).get()
  if (!snap.exists) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 })
  const data = snap.data() as Record<string, unknown>

  const payload = { ...data, status: "paid" }
  const html = renderInvoiceHtml(formatInvoiceData(payload))

  const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production"
  const browser = isProd
    ? await chromium
        .executablePath()
        .then((exePath) => puppeteer.launch({ args: chromium.args, defaultViewport: chromium.defaultViewport, executablePath: exePath || undefined, headless: true }))
    : await puppeteer.launch({ channel: "chrome", headless: true })

  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: "load" }).catch(() => void 0)
  const pdf = await page.pdf({ format: "A4", printBackground: true }).catch(() => undefined as unknown as Uint8Array)
  await page.close().catch(() => void 0)
  await browser.close().catch(() => void 0)

  if (!pdf) return new Response(JSON.stringify({ error: "pdf_failed" }), { status: 500 })
  const buf = Buffer.from(pdf)
  const invoiceNum = (data as { invoice_number?: string }).invoice_number || "receipt"
  return new Response(buf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=${invoiceNum}-receipt.pdf` } })
}


