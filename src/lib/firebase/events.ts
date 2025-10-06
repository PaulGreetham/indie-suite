import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { getFirestoreDb } from "./client"

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
  const col = collection(db, "events")
  const payload = sanitize({
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt ?? null,
    notes: input.notes ?? null,
    customerId: input.customerId,
    venueId: input.venueId,
    createdAt: serverTimestamp(),
  })
  const ref = await addDoc(col, payload)
  return ref.id
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


