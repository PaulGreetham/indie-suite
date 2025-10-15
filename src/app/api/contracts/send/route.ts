import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin"
import { getFirmaClient } from "@/lib/firma/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id?: string }
    if (!id) return new Response(JSON.stringify({ error: "missing_id" }), { status: 400 })

    const hasAdmin = Boolean(
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    )

    let firmaId: string | undefined
    if (hasAdmin) {
      const db = getAdminDb()
      const snap = await db.collection("contracts").doc(id).get()
      if (!snap.exists) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 })
      const data = (snap.data() as { firmaId?: string })
      firmaId = data.firmaId
    }

    const firma = getFirmaClient()
    try {
      // Fetch SR details to include in error context when failing
      const srId = (firmaId || id) as string
      const sr = await firma.getSigningRequest(srId).catch(() => ({}))
      try {
        await firma.sendSigningRequest(srId)
      } catch (e) {
        return new Response(JSON.stringify({ error: 'firma_send_failed', message: (e as Error).message, signingRequest: sr }), { status: 502 })
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: 'firma_send_failed', message: (e as Error).message }), { status: 502 })
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: "internal_error", message: (e as Error).message }), { status: 500 })
  }
}


