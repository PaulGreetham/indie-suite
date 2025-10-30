import { NextRequest } from "next/server"
import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"
import { renderInvoiceHtml, formatInvoiceData } from "@/lib/pdf/invoice-template"
import { getAdminDb } from "@/lib/firebase/admin"
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

    // Optionally enrich with bank account. Prefer explicit id; otherwise fall back to latest for owner+business.
    if ((payload as { include_bank_account?: boolean }).include_bank_account) {
      const db = getAdminDb()
      const bankId = (payload as { bank_account_id?: string }).bank_account_id
      try {
        if (bankId) {
          const ba = await db.collection("settings_bank_accounts").doc(String(bankId)).get()
          if (ba.exists) (payload as Record<string, unknown>).bank_account = ba.data() as Record<string, unknown>
        } else if (!(payload as Record<string, unknown>).bank_account) {
          const ownerId = (payload as { ownerId?: string }).ownerId
          const businessId = (payload as { businessId?: string }).businessId
          if (ownerId && businessId) {
            const snap = await db
              .collection("settings_bank_accounts")
              .where("ownerId", "==", ownerId)
              .where("businessId", "==", businessId)
              .limit(1)
              .get()
              .catch(() => null)
            const doc = snap && !snap.empty ? snap.docs[0] : null
            if (doc?.exists) (payload as Record<string, unknown>).bank_account = doc.data() as Record<string, unknown>
          }
        }
      } catch {
        // ignore enrichment failure; continue without bank account
      }
    }

    // Render invoice HTML
    const html = renderInvoiceHtml(formatInvoiceData(payload as Record<string, unknown>))

    // Allow forcing React-PDF engine for local preview: env PDF_ENGINE=react or ?engine=react
    const engineParam = (req as unknown as { nextUrl?: { searchParams: URLSearchParams } })?.nextUrl?.searchParams?.get?.("engine")
    const forceReact = engineParam === "react" || process.env.PDF_ENGINE === "react"

    let body: Uint8Array
    try {
      if (forceReact) {
        // Fallback path used intentionally for local preview parity
        try {
          const element = React.createElement(InvoicePdf, { invoice: formatInvoiceData(payload as Record<string, unknown>) }) as unknown as React.ReactElement<DocumentProps>
          const pdfBuffer = await renderToBuffer(element)
          body = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer as unknown as ArrayBuffer)
        } catch (e) {
          console.error("React-PDF render error (forceReact)", e)
          throw e
        }
        return new Response(body as unknown as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=${(payload as { invoice_number?: string }).invoice_number || "invoice"}.pdf` } })
      }
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
      try {
        const element = React.createElement(InvoicePdf, { invoice: formatInvoiceData(payload as Record<string, unknown>) }) as unknown as React.ReactElement<DocumentProps>
        const pdfBuffer = await renderToBuffer(element)
        body = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer as unknown as ArrayBuffer)
      } catch (e) {
        console.error("React-PDF render error (fallback)", e)
        throw e
      }
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


