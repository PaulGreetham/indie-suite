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
  const docRef = await addDoc(customersCol, {
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
  return docRef.id
}


