import type { FirmaFieldOverride, FirmaTemplate } from "@/lib/firma/server"

export type ContractDataSource = {
  event: Record<string, unknown>
  customer: Record<string, unknown> | null
  venue: Record<string, unknown> | null
  invoice: Record<string, unknown> | null
  terms: Array<{ text: string }>
  notes?: string
  eventId?: string
  invoiceId?: string | null
}

export function buildContractData({
  event,
  customer,
  venue,
  invoice,
  terms,
  notes,
  eventId,
  invoiceId,
}: ContractDataSource): Record<string, string> {
  const cleanedTerms = terms.map((term) => String(term?.text || "").trim()).filter(Boolean)
  const total = textValue(invoice, "total") || textValue(invoice, "amount") || textValue(invoice, "totalAmount")
  const deposit = textValue(invoice, "deposit") || textValue(invoice, "depositAmount")

  return removeEmptyStrings({
    event_id: eventId,
    event_title: textValue(event, "title"),
    event_start_date: dateValue(event, "startsAt"),
    event_end_date: dateValue(event, "endsAt"),
    event_notes: textValue(event, "notes"),
    customer_id: textValue(event, "customerId"),
    customer_name: textValue(customer, "fullName") || textValue(customer, "name") || textValue(customer, "company"),
    customer_company: textValue(customer, "company"),
    customer_email: textValue(customer, "email"),
    customer_phone: textValue(customer, "phone"),
    venue_id: textValue(event, "venueId"),
    venue_name: textValue(venue, "name"),
    venue_address: textValue(venue, "address"),
    invoice_id: invoiceId || textValue(invoice, "id"),
    invoice_number: textValue(invoice, "number") || textValue(invoice, "invoiceNumber"),
    invoice_total: total,
    invoice_deposit: deposit,
    contract_terms: cleanedTerms.join("\n"),
    contract_notes: String(notes || "").trim(),
    business_id: textValue(event, "businessId"),
  })
}

export function buildFieldOverrides(data: Record<string, string>): FirmaFieldOverride[] {
  return Object.entries(data).map(([variable_name, read_only_value]) => ({
    variable_name,
    read_only: true,
    read_only_value,
  }))
}

export function pickTemplateSigner(template: FirmaTemplate | null): { id?: string; order?: number } | null {
  const recipients = Array.isArray(template?.recipients) ? template.recipients : []
  return recipients.find((recipient) => recipient.designation === "Signer") || recipients[0] || null
}

export function textValue(source: Record<string, unknown> | null | undefined, key: string): string {
  if (!source) return ""
  const value = source[key]
  if (value == null) return ""
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

function removeEmptyStrings(value: Record<string, string | undefined | null>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => Boolean(entry[1]))
  )
}

function dateValue(source: Record<string, unknown> | null | undefined, key: string): string {
  if (!source) return ""
  const value = source[key]
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value === "object") {
    const maybeTimestamp = value as { toDate?: () => Date; seconds?: number }
    if (typeof maybeTimestamp.toDate === "function") return maybeTimestamp.toDate().toISOString()
    if (typeof maybeTimestamp.seconds === "number") return new Date(maybeTimestamp.seconds * 1000).toISOString()
  }
  return ""
}
