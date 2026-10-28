import { NextRequest } from "next/server"
import { buildContractCreatePayload } from "@/lib/contracts/firestore-payload"
import type { ContractInput } from "@/lib/contracts/types"
import { AdminFieldValue, getAdminDb } from "@/lib/firebase/admin"
import { handleRouteError, loadOwned, requireUser } from "@/lib/server/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireUser(req)

    const body = (await req.json().catch(() => null)) as ContractInput | null
    if (!body?.title) return Response.json({ error: "missing_title" }, { status: 400 })

    // Referenced docs must belong to the caller (missing ownerId fails closed)
    if (body.eventId) await loadOwned("events", body.eventId, uid)
    if (body.businessId) await loadOwned("settings_trading_details", body.businessId, uid)

    const payload = buildContractCreatePayload(body, uid, AdminFieldValue.serverTimestamp())

    const ref = await getAdminDb().collection("contracts").add(payload)
    return Response.json({ id: ref.id }, { status: 200 })
  } catch (err) {
    return handleRouteError(err, "/api/contracts/create")
  }
}
