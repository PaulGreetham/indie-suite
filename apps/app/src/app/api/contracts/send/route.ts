import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin"
import { getFirmaClient } from "@/lib/firma/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { id?: string } | null
  const id = body?.id?.trim()
  if (!id) return new Response(JSON.stringify({ error: "missing_id" }), { status: 400 })

  const hasAdmin = Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  )

  let firmaId: string | undefined
  if (hasAdmin) {
    const db = getAdminDb()
    const snap = await db.collection("contracts").doc(id).get().catch(() => null)
    if (!snap) return new Response(JSON.stringify({ error: "query_failed" }), { status: 500 })
    if (!snap.exists) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 })
    const data = (snap.data() as { firmaId?: string })
    firmaId = data.firmaId
  }

  const firma = getFirmaClient()
  const srId = (firmaId || id) as string
  const sr = await firma.getSigningRequest(srId).catch(() => ({}))
  const sentOk = await firma.sendSigningRequest(srId).then(() => true).catch((e: unknown) => {
    return new Response(JSON.stringify({ error: 'firma_send_failed', message: (e as Error)?.message || 'send_failed', signingRequest: sr }), { status: 502 })
  })
  if (sentOk instanceof Response) return sentOk
  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}


