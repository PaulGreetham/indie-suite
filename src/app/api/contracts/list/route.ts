import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ownerId = (searchParams.get("ownerId") || "").trim()
  if (!ownerId) return new Response(JSON.stringify({ error: "missing_ownerId" }), { status: 400 })

  const db = getAdminDb()
  const snap = await db.collection("contracts").where("ownerId", "==", ownerId).get().catch(() => null)
  if (!snap) return new Response(JSON.stringify({ error: "query_failed" }), { status: 500 })
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return new Response(JSON.stringify({ docs }), { status: 200 })
}


