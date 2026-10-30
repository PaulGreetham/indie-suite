import { timingSafeEqual } from "node:crypto"
import { HttpError } from "@/lib/server/auth"

// Guards machine-to-machine routes (cron, admin) with a shared secret sent as "Authorization: Bearer <secret>".
// Refuses every request when the secret isn't configured.
export function requireSecret(req: Request, secret: string | undefined): void {
  const header = req.headers.get("authorization") || ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : ""
  if (!secret || !token) throw new HttpError(401, "unauthorized")
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, "unauthorized")
}
