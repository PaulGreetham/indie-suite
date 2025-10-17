import { addDoc, collection, deleteDoc, doc, serverTimestamp, Timestamp, updateDoc, getDocs, query, where } from "firebase/firestore"
import { getFirestoreDb, getFirebaseAuth } from "./client"
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

function sanitizeForFirestore<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    out[k] = v
  }
  return out as T
}

export async function createInvoice(input: InvoiceInput): Promise<string> {
  const db = getFirestoreDb()
  const uid = getFirebaseAuth().currentUser?.uid
  if (!uid) throw new Error("AUTH_REQUIRED")
  const bizId = input as unknown as { businessId?: string };
  const resolvedBizId = bizId.businessId || await resolveActiveBusinessIdForUser().catch(() => undefined)
  if (!resolvedBizId) throw new Error("BUSINESS_REQUIRED")
  // Enforce uniqueness of invoice_number scoped to owner
  if (input.invoice_number) {
    const dupSnap = await getDocs(query(
      collection(db, "invoices"),
      where("ownerId", "==", uid || "__NONE__"),
      where("invoice_number", "==", input.invoice_number)
    ))
    if (!dupSnap.empty) {
      const err = new Error("INVOICE_NUMBER_NOT_UNIQUE") as Error & { code?: string }
      err.code = "INVOICE_NUMBER_NOT_UNIQUE"
      throw err
    }
  }
  const ref = await addDoc(collection(db, "invoices"), {
    ...sanitizeForFirestore(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ownerId: uid,
    businessId: resolvedBizId,
  })
  return ref.id
}

export async function updateInvoice(id: string, input: Partial<InvoiceInput>): Promise<void> {
  const db = getFirestoreDb()
  const uid = getFirebaseAuth().currentUser?.uid
  if (!uid) throw new Error("AUTH_REQUIRED")
  if (input.invoice_number) {
    const dupSnap = await getDocs(query(
      collection(db, "invoices"),
      where("ownerId", "==", uid || "__NONE__"),
      where("invoice_number", "==", input.invoice_number)
    ))
    // Allow the same doc but prevent collisions with others
    if (dupSnap.docs.some((d) => d.id !== id)) {
      const err = new Error("INVOICE_NUMBER_NOT_UNIQUE") as Error & { code?: string }
      err.code = "INVOICE_NUMBER_NOT_UNIQUE"
      throw err
    }
  }
  await updateDoc(doc(db, "invoices", id), {
    ...sanitizeForFirestore(input),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteInvoice(id: string): Promise<void> {
  const db = getFirestoreDb()
  await deleteDoc(doc(db, "invoices", id))
}


