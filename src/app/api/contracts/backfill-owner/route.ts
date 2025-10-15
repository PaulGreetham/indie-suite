import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { ownerId?: string } | null
  const ownerId = body?.ownerId?.trim()
  if (!ownerId) return new Response(JSON.stringify({ error: "missing_ownerId" }), { status: 400 })

  const db = getAdminDb()
  const snap = await db.collection("contracts").where("ownerId", "==", null).get().catch(() => null)
  if (!snap) return new Response(JSON.stringify({ error: "query_failed" }), { status: 500 })
  const batch = db.batch()
  let count = 0
  snap.docs.forEach((d) => { batch.update(d.ref, { ownerId }); count += 1 })
  const committed = count > 0 ? await batch.commit().then(() => true).catch(() => false) : true
  if (!committed) return new Response(JSON.stringify({ error: "commit_failed" }), { status: 500 })
  return new Response(JSON.stringify({ updated: count }), { status: 200 })
}


