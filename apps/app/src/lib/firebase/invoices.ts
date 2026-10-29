import type { Timestamp } from "firebase/firestore"
import { getFirebaseAuth } from "./client"
import { resolveActiveBusinessIdForUser } from "@/lib/firebase/user-settings"

export type InvoiceLineItem = {
  description: string
  quantity: number
  unit_price: number
}

export type InvoicePayment = {
  // Optional label for display
  name?: string
  // New row fields
  reference?: string
  invoice_number?: string
  issue_date?: string
  currency?: string
  due_date: string // ISO date (YYYY-MM-DD)
  amount: number
}

export type InvoiceInput = {
  invoice_number: string
  issue_date: string // ISO date (YYYY-MM-DD)
  due_date: string // ISO date (YYYY-MM-DD)
  user_business_name: string
  user_email: string
  user_contact_name?: string
  user_phone?: string
  customer_name: string
  customer_contact_name?: string
  customer_email: string
  customer_phone?: string
  line_items: InvoiceLineItem[]
  payments?: InvoicePayment[]
  notes?: string
  payment_link?: string
  eventId?: string
  // Venue (optional)
  venue_name?: string
  venue_city?: string
  venue_postcode?: string
  venue_phone?: string
  // Status (optional)
  status?: "draft" | "sent" | "paid" | "overdue" | "void" | "partial"
  // Payment presentation controls (optional)
  include_payment_link?: boolean
  include_bank_account?: boolean
  include_notes?: boolean
  bank_account_id?: string
}

export type Invoice = InvoiceInput & {
  id: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

function notUniqueError(): Error {
  const err = new Error("INVOICE_NUMBER_NOT_UNIQUE") as Error & { code?: string }
  err.code = "INVOICE_NUMBER_NOT_UNIQUE"
  return err
}

// Invoices are written by the server so invoice numbers are reserved atomically and paidAt is server-set (R-14)
async function invoiceRequest(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<Record<string, unknown>> {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new Error("AUTH_REQUIRED")
  const token = await user.getIdToken()
  const res = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (res.status === 409 && data.error === "invoice_number_taken") throw notUniqueError()
  if (!res.ok) throw new Error(String(data.error || "INVOICE_SAVE_FAILED"))
  return data
}

export async function createInvoice(input: InvoiceInput): Promise<string> {
  const bizId = (input as unknown as { businessId?: string }).businessId || await resolveActiveBusinessIdForUser().catch(() => undefined)
  if (!bizId) throw new Error("BUSINESS_REQUIRED")
  const data = await invoiceRequest("/api/invoices", "POST", { ...input, businessId: bizId })
  return String(data.id)
}

export async function updateInvoice(id: string, input: Partial<InvoiceInput>): Promise<void> {
  await invoiceRequest(`/api/invoices/${encodeURIComponent(id)}`, "PATCH", input)
}

export async function deleteInvoice(id: string): Promise<void> {
  await invoiceRequest(`/api/invoices/${encodeURIComponent(id)}`, "DELETE")
}
