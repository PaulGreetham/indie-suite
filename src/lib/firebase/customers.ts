import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { getFirestoreDb } from "./client"

export type CustomerAddress = {
  building?: string
  street?: string
  city?: string
  area?: string
  postcode?: string
  country?: string
}

export type CustomerInput = {
  fullName: string
  company?: string
  email: string
  phone?: string
  website?: string
  address?: CustomerAddress
  preferredContact?: "email" | "phone" | "other"
  notes?: string
}

export type Customer = CustomerInput & {
  id: string
  createdAt: Date
  eventsLinked: number
  totalValue: number
}

export async function createCustomer(input: CustomerInput): Promise<string> {
  const db = getFirestoreDb()
  const customersCol = collection(db, "customers")
  const payload = sanitizeForFirestore({
    fullName: input.fullName,
    company: input.company ?? null,
    email: input.email,
    phone: input.phone ?? null,
    website: input.website ?? null,
    address: input.address ?? null,
    preferredContact: input.preferredContact ?? null,
    notes: input.notes ?? null,
    createdAt: serverTimestamp(),
    eventsLinked: 0,
    totalValue: 0,
  })

  const docRef = await addDoc(customersCol, payload)
  return docRef.id
}

// Firestore does not allow undefined anywhere in a document. This utility
// removes undefined keys recursively and leaves null/empty strings as-is.
function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (value as any[]).map((v) => sanitizeForFirestore(v)) as unknown as T
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue
      // Recurse for nested objects/arrays
      result[k] = sanitizeForFirestore(v)
    }
    return result as unknown as T
  }
  // primitives (including null) are fine
  return value
}


