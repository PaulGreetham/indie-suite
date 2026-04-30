import { NextRequest } from "next/server"
import { buildContractCreatePayload } from "@/lib/contracts/firestore-payload"
import type { ContractInput } from "@/lib/contracts/types"
import { AdminFieldValue, getAdminAuth, getAdminDb } from "@/lib/firebase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  const decoded = token ? await getAdminAuth().verifyIdToken(token).catch(() => null) : null
  if (!decoded?.uid) return Response.json({ error: "unauthorized" }, { status: 401 })

  const body = (await req.json().catch(() => null)) as ContractInput | null
  if (!body?.title) return Response.json({ error: "missing_title" }, { status: 400 })

  const db = getAdminDb()
  if (body.eventId) {
    const eventSnap = await db.collection("events").doc(body.eventId).get().catch(() => null)
    if (!eventSnap) return Response.json({ error: "event_lookup_failed" }, { status: 500 })
    if (!eventSnap.exists) return Response.json({ error: "event_not_found" }, { status: 404 })
    const eventOwner = (eventSnap.data() as { ownerId?: string } | undefined)?.ownerId
    if (eventOwner && eventOwner !== decoded.uid) return Response.json({ error: "forbidden" }, { status: 403 })
  }

  const payload = buildContractCreatePayload(body, decoded.uid, AdminFieldValue.serverTimestamp())

  const ref = await db.collection("contracts").add(payload)
  return Response.json({ id: ref.id }, { status: 200 })
}
