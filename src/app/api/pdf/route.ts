import { NextRequest } from "next/server"
import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"
import { renderInvoiceHtml, formatInvoiceData } from "@/lib/pdf/invoice-template"
import * as React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import type { DocumentProps } from "@react-pdf/renderer"
import { InvoicePdf } from "@/components/pdf/InvoicePdf"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => null)
    if (!payload) return new Response(JSON.stringify({ error: "bad_request" }), { status: 400 })

    // Render invoice HTML
    const html = renderInvoiceHtml(formatInvoiceData(payload as Record<string, unknown>))

    let body: Uint8Array
    try {
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
        browser = await puppeteer.launch({ channel: "chrome", headless: true })
      }
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: "load" })
      const pdfBytes = await page.pdf({ format: "A4", printBackground: true })
      await page.close().catch(() => void 0)
      await browser.close().catch(() => void 0)
      body = new Uint8Array(pdfBytes)
    } catch (browserErr) {
      // Fallback: render with @react-pdf/renderer to avoid headless browser dependency in prod
      console.warn("Chromium launch failed, falling back to react-pdf:", browserErr instanceof Error ? browserErr.message : browserErr)
      const element = React.createElement(InvoicePdf, { invoice: formatInvoiceData(payload as Record<string, unknown>) }) as unknown as React.ReactElement<DocumentProps>
      const pdfBuffer = await renderToBuffer(element)
      body = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer as unknown as ArrayBuffer)
    }
    const invoiceNum = (payload as { invoice_number?: string }).invoice_number || "invoice"
    return new Response(body as unknown as BodyInit, {
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


