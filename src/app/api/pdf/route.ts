import { NextRequest } from "next/server"
import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"
import { renderInvoiceHtml, formatInvoiceData } from "@/lib/pdf/invoice-template"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null)
  if (!payload) return new Response(JSON.stringify({ error: "bad_request" }), { status: 400 })

  // Backwards compatibility: if this route is used directly, keep rendering with shared helper
  const html = renderInvoiceHtml(formatInvoiceData(payload as Record<string, unknown>))

  const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production"
  let browser
  if (isProd) {
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
  await browser.close()

  // Convert Uint8Array to a Node.js Buffer and return as ArrayBuffer for Web Response
  // This is compatible with Next.js Node runtime
  const buf = Buffer.from(pdf)
  // Use invoice number in file name if available
  const invoiceNum = (payload as { invoice_number?: string }).invoice_number || "invoice"
  return new Response(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${invoiceNum}.pdf`,
    },
  })
}


