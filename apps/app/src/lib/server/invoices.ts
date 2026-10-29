import { createHash } from "node:crypto"
import { getAdminDb } from "@/lib/firebase/admin"
import { loadOwned } from "@/lib/server/auth"

// Server-only reservation docs make invoice numbers unique per owner inside a transaction (R-14).
// The number is hashed so any characters (including "/") give a valid document id.
export const INVOICE_NUMBERS_COLLECTION = "invoice_numbers"

export function invoiceNumberRef(uid: string, invoiceNumber: string) {
  const hash = createHash("sha256").update(invoiceNumber.trim()).digest("hex")
  return getAdminDb().collection(INVOICE_NUMBERS_COLLECTION).doc(`${uid}__${hash}`)
}

export function hasInvoiceNumber(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

// eventId and bank_account_id, when set, must be the caller's own documents (S-01). Throws 404 otherwise.
export async function assertOwnedInvoiceRefs(fields: Record<string, unknown>, uid: string): Promise<void> {
  if (typeof fields.eventId === "string") await loadOwned("events", fields.eventId, uid)
  if (typeof fields.bank_account_id === "string") await loadOwned("settings_bank_accounts", fields.bank_account_id, uid)
}
