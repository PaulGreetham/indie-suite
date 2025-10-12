import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { ownerId } = (await req.json()) as { ownerId?: string }
    if (!ownerId) return new Response(JSON.stringify({ error: "missing_ownerId" }), { status: 400 })

    const db = getAdminDb()
    const snap = await db.collection("contracts").where("ownerId", "==", null).get()
    const batch = db.batch()
    let count = 0
    snap.docs.forEach((d) => {
      batch.update(d.ref, { ownerId })
      count += 1
    })
    if (count > 0) await batch.commit()
    return new Response(JSON.stringify({ updated: count }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 })
  }
}


