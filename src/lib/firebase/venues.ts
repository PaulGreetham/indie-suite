import { addDoc, collection, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { getFirestoreDb, getFirebaseAuth } from "./client"

export type VenueAddress = {
  building?: string
  street?: string
  city?: string
  area?: string
  postcode?: string
  country?: string
}

export type VenueInput = {
  name: string
  phone?: string
  website?: string
  address?: VenueAddress
  notes?: string
  businessId?: string
}

export type Venue = VenueInput & {
  id: string
  createdAt: Date
  eventsLinked: number
  totalValue: number
}

export async function createVenue(input: VenueInput): Promise<string> {
  const db = getFirestoreDb()
  const uid = getFirebaseAuth().currentUser?.uid
  if (!uid) throw new Error("AUTH_REQUIRED")
  const bizId = input.businessId || (typeof window !== "undefined" ? window.localStorage?.getItem?.("activeBusinessId") || undefined : undefined)
  if (!bizId) throw new Error("BUSINESS_REQUIRED")
  const col = collection(db, "venues")
  const payload = sanitizeForFirestore({
    name: input.name,
    nameLower: input.name.toLowerCase(),
    phone: input.phone ?? null,
    website: input.website ?? null,
    address: input.address ?? null,
    notes: input.notes ?? null,
    createdAt: serverTimestamp(),
    eventsLinked: 0,
    totalValue: 0,
    ownerId: uid,
    businessId: bizId,
  })
  const docRef = await addDoc(col, payload)
  return docRef.id
}

export async function updateVenue(id: string, updates: Partial<VenueInput>): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "venues", id)
  const payload = sanitizeForFirestore({
    name: updates.name,
    nameLower: updates.name ? updates.name.toLowerCase() : undefined,
    phone: updates.phone ?? null,
    website: updates.website ?? null,
    address: updates.address ?? null,
    notes: updates.notes ?? null,
    // businessId should never change after creation; do not allow overriding
  })
  await updateDoc(ref, payload as Record<string, unknown>)
}

export async function deleteVenue(id: string): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "venues", id)
  await deleteDoc(ref)
}

function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (value as any[]).map((v) => sanitizeForFirestore(v)) as unknown as T
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue
      result[k] = sanitizeForFirestore(v)
    }
    return result as unknown as T
  }
  return value
}


