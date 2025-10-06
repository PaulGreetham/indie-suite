import { addDoc, collection, deleteDoc, doc, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore"
import { getFirestoreDb } from "./client"

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
  customer_name: string
  customer_email: string
  line_items: InvoiceLineItem[]
  payments?: InvoicePayment[]
  notes?: string
  payment_link?: string
  eventId?: string
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
  const ref = await addDoc(collection(db, "invoices"), {
    ...sanitizeForFirestore(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateInvoice(id: string, input: Partial<InvoiceInput>): Promise<void> {
  const db = getFirestoreDb()
  await updateDoc(doc(db, "invoices", id), {
    ...sanitizeForFirestore(input),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteInvoice(id: string): Promise<void> {
  const db = getFirestoreDb()
  await deleteDoc(doc(db, "invoices", id))
}


