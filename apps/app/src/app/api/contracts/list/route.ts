import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin"
import { handleRouteError, jsonError, requireActiveUser } from "@/lib/server/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { uid } = await requireActiveUser(req)

    const db = getAdminDb()
    const snap = await db.collection("contracts").where("ownerId", "==", uid).get().catch(() => null)
    if (!snap) return jsonError("query_failed", 500)
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return new Response(JSON.stringify({ docs }), { status: 200 })
  } catch (err) {
    return handleRouteError(err, "/api/contracts/list")
  }
}
