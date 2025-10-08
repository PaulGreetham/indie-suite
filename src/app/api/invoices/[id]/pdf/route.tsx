import * as React from "react"
import { renderToStream } from "@react-pdf/renderer"
import { InvoicePdf } from "@/components/pdf/InvoicePdf"
import { adminDb, adminAuth } from "@/lib/firebase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  // Verify user (via token in Authorization header or token query param)
  const url = new URL(req.url)
  const bearer = req.headers.get("authorization") || ""
  const token = url.searchParams.get("token") || (bearer.startsWith("Bearer ") ? bearer.slice(7) : undefined)
  if (!token) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })
  let uid: string
  try {
    const decoded = await adminAuth.verifyIdToken(token)
    uid = decoded.uid
  } catch {
    return new Response(JSON.stringify({ error: "invalid_token" }), { status: 401, headers: { "Content-Type": "application/json" } })
  }
  const { id } = typeof (context.params as any).then === "function" ? await (context.params as Promise<{ id: string }>) : (context.params as { id: string })
  const snap = await adminDb.collection("invoices").doc(id).get()
  if (!snap.exists) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } })
  }
  const data = snap.data()!
  // Enforce ownership (assumes ownerUid saved at create time). If missing, allow only for now.
  if (data.ownerUid && data.ownerUid !== uid) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } })
  }
  const stream = await renderToStream(<InvoicePdf invoice={data as any} />)
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${id}.pdf"`,
    },
  })
}


