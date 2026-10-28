import type { DecodedIdToken } from "firebase-admin/auth"
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin"

// Error with an HTTP status and a stable code that is safe to return to the client
export class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code)
  }
}

export function jsonError(code: string, status: number): Response {
  return new Response(JSON.stringify({ error: code }), { status })
}

// Converts thrown errors into responses. Unknown errors are logged and never echoed to the client.
export function handleRouteError(err: unknown, context: string): Response {
  if (err instanceof HttpError) return jsonError(err.code, err.status)
  console.error(`${context} error:`, err instanceof Error ? err.message : err)
  return jsonError("internal_error", 500)
}

// Verifies the Bearer ID token (including revocation) and, by default, requires a verified email
export async function requireUser(
  req: Request,
  { verifiedEmail = true }: { verifiedEmail?: boolean } = {}
): Promise<DecodedIdToken> {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""
  if (!token) throw new HttpError(401, "unauthorized")
  const decoded = await getAdminAuth().verifyIdToken(token, true).catch(() => null)
  if (!decoded?.uid) throw new HttpError(401, "unauthorized")
  if (verifiedEmail && decoded.email_verified !== true) throw new HttpError(403, "email_unverified")
  return decoded
}

// Loads a document only if it belongs to uid. Missing docs, missing ownerId and foreign docs all return 404.
export async function loadOwned<T extends Record<string, unknown> = Record<string, unknown>>(
  collection: string,
  id: unknown,
  uid: string
): Promise<T & { id: string }> {
  if (typeof id !== "string" || !id.trim()) throw new HttpError(404, "not_found")
  const snap = await getAdminDb().collection(collection).doc(id).get()
  const data = snap.exists ? (snap.data() as T | undefined) : undefined
  if (!data || data.ownerId !== uid) throw new HttpError(404, "not_found")
  return { ...data, id: snap.id }
}
