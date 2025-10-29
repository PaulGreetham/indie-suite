import { NextRequest } from "next/server"
import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"
import { renderInvoiceHtml, formatInvoiceData } from "@/lib/pdf/invoice-template"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => null)
    if (!payload) return new Response(JSON.stringify({ error: "bad_request" }), { status: 400 })

    // Render invoice HTML
    const html = renderInvoiceHtml(formatInvoiceData(payload as Record<string, unknown>))

    const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production"
    let browser
    if (isProd) {
      // Production: always use packaged @sparticuz/chromium path for maximum compatibility
      const exePath = await chromium.executablePath()
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: exePath || undefined,
        headless: true,
      })
    } else {
      // Local dev: use installed Chrome channel
      browser = await puppeteer.launch({
        channel: "chrome",
        headless: true,
      })
    }
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "load" })
    const pdf = await page.pdf({ format: "A4", printBackground: true })
    await page.close().catch(() => void 0)
    await browser.close().catch(() => void 0)

    const buf = Buffer.from(pdf)
    const invoiceNum = (payload as { invoice_number?: string }).invoice_number || "invoice"
    return new Response(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${invoiceNum}.pdf`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("/api/pdf error:", message)
    return new Response(JSON.stringify({ error: "pdf_failed", message }), { status: 500 })
  }
}


