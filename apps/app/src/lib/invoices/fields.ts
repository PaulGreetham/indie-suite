import { HttpError } from "@/lib/server/auth"

// Server-side allow-list and validation for invoice writes (mirrors InvoiceInput). Unknown keys are dropped.
const STRING_FIELDS: Record<string, number> = {
  invoice_number: 50, issue_date: 40, due_date: 40,
  user_business_name: 200, user_email: 200, user_contact_name: 200, user_phone: 50,
  customer_name: 200, customer_contact_name: 200, customer_email: 200, customer_phone: 50,
  venue_name: 200, venue_city: 200, venue_postcode: 50, venue_phone: 50,
  notes: 5000, payment_link: 500,
}
const BOOL_FIELDS = ["include_payment_link", "include_bank_account", "include_notes"]
const REF_FIELDS = ["eventId", "bank_account_id"]
export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue", "void", "partial"]

function invalid(): never {
  throw new HttpError(400, "invalid_invoice")
}

function str(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length > max) invalid()
  return value
}

function optStr(value: unknown, max: number): string | undefined {
  return value === undefined || value === null ? undefined : str(value, max)
}

function num(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) invalid()
  return value
}

function lineItems(value: unknown) {
  if (!Array.isArray(value) || value.length > 100) invalid()
  return value.map((item: Record<string, unknown>) => ({
    description: str(item?.description ?? "", 500),
    quantity: num(item?.quantity),
    unit_price: num(item?.unit_price),
  }))
}

function payments(value: unknown) {
  if (!Array.isArray(value) || value.length > 24) invalid()
  return value.map((p: Record<string, unknown>) => {
    const out: Record<string, unknown> = { due_date: str(p?.due_date ?? "", 40), amount: num(p?.amount) }
    const optional = { name: optStr(p?.name, 200), reference: optStr(p?.reference, 200), invoice_number: optStr(p?.invoice_number, 50), issue_date: optStr(p?.issue_date, 40), currency: optStr(p?.currency, 10) }
    for (const [k, v] of Object.entries(optional)) if (v !== undefined) out[k] = v
    return out
  })
}

// Returns only the allowed, validated fields present in body. Throws 400 invalid_invoice otherwise.
export function parseInvoiceFields(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) invalid()
  const input = body as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [field, max] of Object.entries(STRING_FIELDS)) {
    if (field in input) out[field] = input[field] === null ? null : str(input[field], max)
  }
  for (const field of BOOL_FIELDS) {
    if (field in input) {
      if (input[field] !== null && typeof input[field] !== "boolean") invalid()
      out[field] = input[field]
    }
  }
  for (const field of REF_FIELDS) {
    if (field in input) {
      if (input[field] !== null && (typeof input[field] !== "string" || !(input[field] as string).trim())) invalid()
      out[field] = input[field]
    }
  }
  if ("status" in input) {
    if (!INVOICE_STATUSES.includes(input.status as string)) invalid()
    out.status = input.status
  }
  if ("line_items" in input) out.line_items = lineItems(input.line_items)
  if ("payments" in input) out.payments = payments(input.payments)
  return out
}
