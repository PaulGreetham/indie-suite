import { addDoc, collection, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { getFirestoreDb, getFirebaseAuth } from "./client"
import { stripUndefined } from "@/lib/strip-undefined"

export type EventInput = {
  title: string
  startsAt: string // ISO date-time
  endsAt?: string // ISO date-time
  notes?: string
  customerId: string
  venueId: string
  businessId?: string
}

export async function createEvent(input: EventInput): Promise<string> {
  const db = getFirestoreDb()
  const uid = getFirebaseAuth().currentUser?.uid
  if (!uid) throw new Error("AUTH_REQUIRED")
  const bizId = input.businessId || (typeof window !== "undefined"
    ? (window.sessionStorage?.getItem?.("activeBusinessId") || window.localStorage?.getItem?.("activeBusinessId") || undefined)
    : undefined)
  if (!bizId) throw new Error("BUSINESS_REQUIRED")
  const col = collection(db, "events")
  const payload = stripUndefined({
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt ?? null,
    notes: input.notes ?? null,
    customerId: input.customerId,
    venueId: input.venueId,
    createdAt: serverTimestamp(),
    ownerId: uid,
    businessId: bizId,
  })
  const ref = await addDoc(col, payload)
  return ref.id
}

export async function updateEvent(id: string, updates: Partial<EventInput>): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "events", id)
  const payload = stripUndefined({
    title: updates.title,
    startsAt: updates.startsAt,
    endsAt: updates.endsAt ?? null,
    notes: updates.notes ?? null,
    customerId: updates.customerId,
    venueId: updates.venueId,
  })
  await updateDoc(ref, payload as Record<string, unknown>)
}

export async function deleteEvent(id: string): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "events", id)
  await deleteDoc(ref)
}
