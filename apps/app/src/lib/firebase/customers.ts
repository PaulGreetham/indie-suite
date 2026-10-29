import { addDoc, collection, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { getFirestoreDb, getFirebaseAuth } from "./client"
import { stripUndefined } from "@/lib/strip-undefined"

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
  businessId?: string
}

export type Customer = CustomerInput & {
  id: string
  createdAt: Date
  eventsLinked: number
  totalValue: number
}

export async function createCustomer(input: CustomerInput): Promise<string> {
  const db = getFirestoreDb()
  const uid = getFirebaseAuth().currentUser?.uid
  if (!uid) throw new Error("AUTH_REQUIRED")
  const bizId = input.businessId || (typeof window !== "undefined"
    ? (window.sessionStorage?.getItem?.("activeBusinessId") || window.localStorage?.getItem?.("activeBusinessId") || undefined)
    : undefined)
  if (!bizId) throw new Error("BUSINESS_REQUIRED")
  const customersCol = collection(db, "customers")
  const payload = stripUndefined({
    fullName: input.fullName,
    fullNameLower: input.fullName.toLowerCase(),
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
    ownerId: uid,
    businessId: bizId,
  })

  const docRef = await addDoc(customersCol, payload)
  return docRef.id
}

export async function updateCustomer(id: string, updates: Partial<CustomerInput>): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "customers", id)
  const payload = stripUndefined({
    fullName: updates.fullName,
    fullNameLower: updates.fullName ? updates.fullName.toLowerCase() : undefined,
    company: updates.company ?? null,
    email: updates.email,
    phone: updates.phone ?? null,
    website: updates.website ?? null,
    address: updates.address ?? null,
    notes: updates.notes ?? null,
  })
  await updateDoc(ref, payload as Record<string, unknown>)
}

export async function deleteCustomer(id: string): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "customers", id)
  await deleteDoc(ref)
}
