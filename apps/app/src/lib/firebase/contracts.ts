import { addDoc, collection, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { getFirestoreDb, getFirebaseAuth } from "./client"

export type ContractTerm = {
  text: string
}

export type ContractInput = {
  title: string
  invoiceId?: string
  templateId?: string
  body?: string
  customerId?: string
  eventId?: string
  venueId?: string
  issueDate?: string // YYYY-MM-DD
  dueDate?: string // YYYY-MM-DD (signature due)
  notes?: string
  status?: "draft" | "sent" | "signed" | "declined" | "void"
  terms?: ContractTerm[]
  firmaId?: string
  firmaUrl?: string
}

export async function createContract(input: ContractInput): Promise<string> {
  const db = getFirestoreDb()
  const uid = getFirebaseAuth().currentUser?.uid
  if (!uid) throw new Error("AUTH_REQUIRED")
  const col = collection(db, "contracts")
  const payload = sanitizeForFirestore({
    title: input.title,
    titleLower: input.title.toLowerCase(),
    invoiceId: input.invoiceId ?? null,
    templateId: input.templateId ?? null,
    body: input.body ?? null,
    customerId: input.customerId ?? null,
    eventId: input.eventId ?? null,
    venueId: input.venueId ?? null,
    issueDate: input.issueDate ?? null,
    dueDate: input.dueDate ?? null,
    notes: input.notes ?? null,
    status: input.status ?? "draft",
    terms: Array.isArray(input.terms) ? input.terms.map((t) => ({ text: String(t?.text || "") })) : null,
    firmaId: input.firmaId ?? null,
    firmaUrl: input.firmaUrl ?? null,
    createdAt: serverTimestamp(),
    ownerId: uid,
  })
  const ref = await addDoc(col, payload)
  return ref.id
}

export async function updateContract(id: string, updates: Partial<ContractInput>): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "contracts", id)
  const payload = sanitizeForFirestore({
    title: updates.title,
    titleLower: updates.title ? updates.title.toLowerCase() : undefined,
    invoiceId: updates.invoiceId ?? null,
    templateId: updates.templateId ?? null,
    body: updates.body ?? null,
    customerId: updates.customerId ?? null,
    eventId: updates.eventId ?? null,
    venueId: updates.venueId ?? null,
    issueDate: updates.issueDate ?? null,
    dueDate: updates.dueDate ?? null,
    notes: updates.notes ?? null,
    status: updates.status,
    terms: Array.isArray(updates.terms) ? updates.terms.map((t) => ({ text: String(t?.text || "") })) : undefined,
    firmaId: updates.firmaId ?? null,
    firmaUrl: updates.firmaUrl ?? null,
  })
  await updateDoc(ref, payload as Record<string, unknown>)
}

export async function deleteContract(id: string): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "contracts", id)
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


