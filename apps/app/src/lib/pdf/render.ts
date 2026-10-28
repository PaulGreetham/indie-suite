import chromium from "@sparticuz/chromium"
import puppeteer, { type Browser } from "puppeteer-core"
import * as React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import type { DocumentProps } from "@react-pdf/renderer"
import { InvoicePdf } from "@/components/pdf/InvoicePdf"
import { formatInvoiceData, renderInvoiceHtml } from "./invoice-template"

// Renders an invoice payload to PDF. Uses Chromium (HTML template) by default and falls back to React-PDF.
export async function renderInvoicePdf(
  payload: Record<string, unknown>,
  { engine }: { engine?: string | null } = {}
): Promise<Uint8Array> {
  if (engine === "react" || process.env.PDF_ENGINE === "react") return renderWithReactPdf(payload)
  try {
    return await renderWithChromium(renderInvoiceHtml(formatInvoiceData(payload)))
  } catch (err) {
    console.warn("Chromium render failed, falling back to react-pdf:", err instanceof Error ? err.message : err)
    return renderWithReactPdf(payload)
  }
}

async function renderWithChromium(html: string): Promise<Uint8Array> {
  const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production"
  let browser: Browser | null = null
  try {
    browser = isProd
      ? await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: (await chromium.executablePath()) || undefined,
          headless: true,
        })
      : await puppeteer.launch({ channel: "chrome", headless: true })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "load" })
    return new Uint8Array(await page.pdf({ format: "A4", printBackground: true }))
  } finally {
    await browser?.close().catch(() => void 0)
  }
}

async function renderWithReactPdf(payload: Record<string, unknown>): Promise<Uint8Array> {
  const element = React.createElement(InvoicePdf, { invoice: formatInvoiceData(payload) }) as unknown as React.ReactElement<DocumentProps>
  const buf = await renderToBuffer(element)
  return buf instanceof Uint8Array ? buf : new Uint8Array(buf as unknown as ArrayBuffer)
}

// Restricts a user-controlled filename to a safe character set
export function safePdfFilename(name: unknown, fallback: string): string {
  const cleaned = String(name ?? "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-{2,}/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 100)
  return `${cleaned || fallback}.pdf`
}

export function pdfResponse(bytes: Uint8Array, filename: string): Response {
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
