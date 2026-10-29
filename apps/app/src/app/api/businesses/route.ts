import { NextRequest } from "next/server"
import { AdminFieldValue, getAdminDb } from "@/lib/firebase/admin"
import { getBilling, getBusinessLimit } from "@/lib/stripe/billing"
import { HttpError, handleRouteError, jsonError, requireActiveUser } from "@/lib/server/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TEXT_FIELDS = ["name", "contactName", "contactEmail", "phone", "building", "street", "city", "area", "postcode", "country"] as const
const MAX_LENGTH = 200

function text(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim().slice(0, MAX_LENGTH)
  return trimmed || null
}

// Creates a business (settings_trading_details doc) within the plan's limit. The rules deny client creates.
export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireActiveUser(req)

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const doc: Record<string, unknown> = {}
    for (const field of TEXT_FIELDS) doc[field] = text(body?.[field])
    if (!doc.name) return jsonError("missing_name", 400)
    const emails = Array.isArray(body?.emails) ? body.emails.map(text).filter(Boolean).slice(0, 10) : []
    doc.emails = emails.length ? emails : null

    const limit = getBusinessLimit((await getBilling(uid))?.plan)
    const db = getAdminDb()
    const col = db.collection("settings_trading_details")

    // Count and create in one transaction so concurrent requests can't exceed the limit
    const id = await db.runTransaction(async (tx) => {
      const existing = await tx.get(col.where("ownerId", "==", uid).limit(limit))
      if (existing.size >= limit) throw new HttpError(403, "business_limit_reached")
      const ref = col.doc()
      tx.create(ref, { ...doc, ownerId: uid, createdAt: AdminFieldValue.serverTimestamp() })
      return ref.id
    })

    return new Response(JSON.stringify({ id }), { status: 200 })
  } catch (err) {
    return handleRouteError(err, "/api/businesses")
  }
}
