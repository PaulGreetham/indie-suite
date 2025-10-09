import { addDoc, collection, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { getFirestoreDb, getFirebaseAuth } from "./client"

export type EventInput = {
  title: string
  startsAt: string // ISO date-time
  endsAt?: string // ISO date-time
  notes?: string
  customerId: string
  venueId: string
}

export async function createEvent(input: EventInput): Promise<string> {
  const db = getFirestoreDb()
  const uid = getFirebaseAuth().currentUser?.uid
  if (!uid) throw new Error("AUTH_REQUIRED")
  const col = collection(db, "events")
  const payload = sanitize({
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt ?? null,
    notes: input.notes ?? null,
    customerId: input.customerId,
    venueId: input.venueId,
    createdAt: serverTimestamp(),
    ownerId: uid,
  })
  const ref = await addDoc(col, payload)
  return ref.id
}

export async function updateEvent(id: string, updates: Partial<EventInput>): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "events", id)
  const payload = sanitize({
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

function sanitize<T>(v: T): T {
  if (Array.isArray(v)) return (v as unknown[]).map((x) => sanitize(x)) as unknown as T
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val === undefined) continue
      out[k] = sanitize(val)
    }
    return out as unknown as T
  }
  return v
}


