import { addDoc, collection, serverTimestamp, getDocs, orderBy, query, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { getFirestoreDb } from "./client"

export type TradingDetailsInput = {
  name: string
  // Primary contact info
  contactName?: string
  contactEmail?: string
  phone?: string
  // Legacy email list kept for backward compatibility
  emails?: string[]
  // Address
  building?: string
  street?: string
  city?: string
  area?: string
  postcode?: string
  country?: string
}

export type TradingDetails = TradingDetailsInput & {
  id: string
  createdAt: Date
}

export async function listTradingDetails(): Promise<TradingDetails[]> {
  const db = getFirestoreDb()
  const newCol = collection(db, "settings_trading_details")
  const snap = await getDocs(query(newCol, orderBy("createdAt", "desc")))
  return snap.docs.map((d) => {
    const v = d.data() as Record<string, unknown>
    return {
      id: d.id,
      name: String(v.name || ""),
      contactName: v.contactName ? String(v.contactName) : undefined,
      contactEmail: v.contactEmail ? String(v.contactEmail) : undefined,
      emails: Array.isArray(v.emails) ? (v.emails as unknown[]).map(String) : (typeof v.emails === "string" && v.emails ? [String(v.emails)] : undefined),
      phone: v.phone ? String(v.phone) : undefined,
      building: v.building ? String(v.building) : undefined,
      street: v.street ? String(v.street) : undefined,
      city: v.city ? String(v.city) : undefined,
      area: v.area ? String(v.area) : undefined,
      postcode: v.postcode ? String(v.postcode) : undefined,
      country: v.country ? String(v.country) : undefined,
      createdAt: new Date(String(v.createdAt ?? Date.now())),
    }
  })
}

export async function createTradingDetails(input: TradingDetailsInput): Promise<string> {
  const db = getFirestoreDb()
  const col = collection(db, "settings_trading_details")
  const ref = await addDoc(col, sanitize({
    name: input.name,
    contactName: input.contactName ?? null,
    contactEmail: input.contactEmail ?? null,
    emails: input.emails && input.emails.length ? input.emails : null,
    phone: input.phone ?? null,
    building: input.building ?? null,
    street: input.street ?? null,
    city: input.city ?? null,
    area: input.area ?? null,
    postcode: input.postcode ?? null,
    country: input.country ?? null,
    createdAt: serverTimestamp(),
  }))
  return ref.id
}

export async function updateTradingDetails(id: string, updates: Partial<TradingDetailsInput>): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "settings_trading_details", id)
  await updateDoc(ref, sanitize({
    name: updates.name,
    contactName: updates.contactName ?? null,
    contactEmail: updates.contactEmail ?? null,
    emails: updates.emails && updates.emails.length ? updates.emails : null,
    phone: updates.phone ?? null,
    building: updates.building ?? null,
    street: updates.street ?? null,
    city: updates.city ?? null,
    area: updates.area ?? null,
    postcode: updates.postcode ?? null,
    country: updates.country ?? null,
  }) as Record<string, unknown>)
}

export async function deleteTradingDetails(id: string): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "settings_trading_details", id)
  await deleteDoc(ref)
}

export type BankAccountInput = {
  name: string
  bankName?: string
  accountHolder?: string
  accountNumberOrIban?: string
  sortCodeOrBic?: string
  currency?: string
  notes?: string
}

export type BankAccount = BankAccountInput & {
  id: string
  createdAt: Date
}

export async function listBankAccounts(): Promise<BankAccount[]> {
  const db = getFirestoreDb()
  const col = collection(db, "settings_bank_accounts")
  const snap = await getDocs(query(col, orderBy("createdAt", "desc")))
  return snap.docs.map((d) => {
    const v = d.data() as Record<string, unknown>
    return {
      id: d.id,
      name: String(v.name || ""),
      bankName: v.bankName ? String(v.bankName) : undefined,
      accountHolder: v.accountHolder ? String(v.accountHolder) : undefined,
      accountNumberOrIban: v.accountNumberOrIban ? String(v.accountNumberOrIban) : undefined,
      sortCodeOrBic: v.sortCodeOrBic ? String(v.sortCodeOrBic) : undefined,
      currency: v.currency ? String(v.currency) : undefined,
      notes: v.notes ? String(v.notes) : undefined,
      createdAt: new Date(String(v.createdAt ?? Date.now())),
    }
  })
}

export async function createBankAccount(input: BankAccountInput): Promise<string> {
  const db = getFirestoreDb()
  const col = collection(db, "settings_bank_accounts")
  const ref = await addDoc(col, sanitize({
    name: input.name,
    bankName: input.bankName ?? null,
    accountHolder: input.accountHolder ?? null,
    accountNumberOrIban: input.accountNumberOrIban ?? null,
    sortCodeOrBic: input.sortCodeOrBic ?? null,
    currency: input.currency ?? null,
    notes: input.notes ?? null,
    createdAt: serverTimestamp(),
  }))
  return ref.id
}

export async function updateBankAccount(id: string, updates: Partial<BankAccountInput>): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "settings_bank_accounts", id)
  await updateDoc(ref, sanitize({
    name: updates.name,
    bankName: updates.bankName ?? null,
    accountHolder: updates.accountHolder ?? null,
    accountNumberOrIban: updates.accountNumberOrIban ?? null,
    sortCodeOrBic: updates.sortCodeOrBic ?? null,
    currency: updates.currency ?? null,
    notes: updates.notes ?? null,
  }) as Record<string, unknown>)
}

export async function deleteBankAccount(id: string): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "settings_bank_accounts", id)
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


