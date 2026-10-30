import { NextRequest } from "next/server"
import { eraseUser } from "@/lib/server/erase-user"
import { handleRouteError, jsonError } from "@/lib/server/auth"
import { requireSecret } from "@/lib/server/secret-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Erases one user on request (right to erasure). Operator-only: protected by ADMIN_API_SECRET, and the uid
// must be repeated in "confirm" to guard against mistakes.
export async function POST(req: NextRequest) {
  try {
    requireSecret(req, process.env.ADMIN_API_SECRET)
    const body = (await req.json().catch(() => null)) as { uid?: string; confirm?: string } | null
    const uid = body?.uid?.trim()
    if (!uid || body?.confirm !== uid) return jsonError("confirmation_mismatch", 400)
    const result = await eraseUser(uid)
    console.log("admin erase-user", result)
    return new Response(JSON.stringify(result), { status: 200 })
  } catch (err) {
    return handleRouteError(err, "/api/admin/erase-user")
  }
}
