import { addDoc, collection, serverTimestamp, getDoc, getDocs, orderBy, query, doc, updateDoc, deleteDoc, where, limit } from "firebase/firestore"
import { getFirestoreDb, getFirebaseAuth } from "./client"
import { stripUndefined } from "@/lib/strip-undefined"

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
  const uid = getFirebaseAuth().currentUser?.uid
  const newCol = collection(db, "settings_trading_details")
  const snap = await getDocs(query(newCol, where("ownerId", "==", uid || "__NONE__"), orderBy("createdAt", "desc")))
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

// Created server-side so the plan's business limit is enforced; throws BUSINESS_LIMIT_REACHED at the limit
export async function createTradingDetails(input: TradingDetailsInput): Promise<string> {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new Error("AUTH_REQUIRED")
  const token = await user.getIdToken()
  const res = await fetch("/api/businesses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
  const body = (await res.json().catch(() => null)) as { id?: string; error?: string } | null
  if (res.status === 403 && body?.error === "business_limit_reached") throw new Error("BUSINESS_LIMIT_REACHED")
  if (!res.ok || !body?.id) throw new Error(body?.error || "BUSINESS_CREATE_FAILED")
  return body.id
}

export async function updateTradingDetails(id: string, updates: Partial<TradingDetailsInput>): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "settings_trading_details", id)
  await updateDoc(ref, stripUndefined({
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

// Deleted server-side with the business's records; throws BUSINESS_HAS_INVOICES if it has invoices
export async function deleteTradingDetails(id: string): Promise<void> {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new Error("AUTH_REQUIRED")
  const token = await user.getIdToken()
  const res = await fetch(`/api/businesses/${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
  const body = (await res.json().catch(() => null)) as { error?: string } | null
  if (res.status === 409 && body?.error === "business_has_invoices") throw new Error("BUSINESS_HAS_INVOICES")
  if (!res.ok) throw new Error(body?.error || "BUSINESS_DELETE_FAILED")
  if (typeof window !== "undefined") {
    for (const storage of [window.sessionStorage, window.localStorage]) {
      if (storage.getItem("activeBusinessId") === id) {
        storage.removeItem("activeBusinessId")
        storage.removeItem("activeBusinessName")
      }
    }
  }
}

export type BankAccountInput = {
  name: string
  bankName?: string
  accountHolder?: string
  accountNumberOrIban?: string
  sortCodeOrBic?: string
  currency?: string
  notes?: string
  businessId?: string
}

export type BankAccount = BankAccountInput & {
  id: string
  createdAt: Date
}

export async function listBankAccounts(): Promise<BankAccount[]> {
  const db = getFirestoreDb()
  const col = collection(db, "settings_bank_accounts")
  const uid = getFirebaseAuth().currentUser?.uid
  const bizId = await resolveActiveBusinessIdForUser()
  const snap = await getDocs(query(col, where("ownerId", "==", uid || "__NONE__"), where("businessId","==", bizId), orderBy("createdAt", "desc")))
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
  const uid = getFirebaseAuth().currentUser?.uid
  const col = collection(db, "settings_bank_accounts")
  const bizId = input.businessId || await resolveActiveBusinessIdForUser().catch(() => undefined)
  if (!bizId) throw new Error("BUSINESS_REQUIRED")
  const ref = await addDoc(col, stripUndefined({
    name: input.name,
    bankName: input.bankName ?? null,
    accountHolder: input.accountHolder ?? null,
    accountNumberOrIban: input.accountNumberOrIban ?? null,
    sortCodeOrBic: input.sortCodeOrBic ?? null,
    currency: input.currency ?? null,
    notes: input.notes ?? null,
    createdAt: serverTimestamp(),
    ownerId: uid,
    businessId: bizId,
  }))
  return ref.id
}

export async function updateBankAccount(id: string, updates: Partial<BankAccountInput>): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "settings_bank_accounts", id)
  await updateDoc(ref, stripUndefined({
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
// Business ids already confirmed as owned by the signed-in user in this session
const verifiedBusinessIds = new Set<string>()

// True if the business exists and belongs to the signed-in user. A stored id can be stale (deleted business,
// wiped data) or from another account on a shared browser, and the rules reject writes that reference it.
export async function isOwnBusiness(id: string): Promise<boolean> {
  const uid = getFirebaseAuth().currentUser?.uid
  if (!uid || !id) return false
  const cacheKey = `${uid}:${id}`
  if (verifiedBusinessIds.has(cacheKey)) return true
  const snap = await getDoc(doc(getFirestoreDb(), "settings_trading_details", id)).catch(() => null)
  const owned = Boolean(snap?.exists() && (snap.data() as { ownerId?: string }).ownerId === uid)
  if (owned) verifiedBusinessIds.add(cacheKey)
  return owned
}

// Resolve active business id without React context; used inside lib functions
export async function resolveActiveBusinessIdForUser(): Promise<string> {
  if (typeof window !== "undefined") {
    const stored = window.sessionStorage.getItem("activeBusinessId") || window.localStorage.getItem("activeBusinessId")
    if (stored && await isOwnBusiness(stored)) return stored
    if (stored) {
      window.sessionStorage.removeItem("activeBusinessId")
      window.localStorage.removeItem("activeBusinessId")
    }
  }
  const uid = getFirebaseAuth().currentUser?.uid
  if (!uid) throw new Error("AUTH_REQUIRED")
  const db = getFirestoreDb()
  const snap = await getDocs(query(collection(db, "settings_trading_details"), where("ownerId", "==", uid), orderBy("createdAt", "desc"), limit(1)))
  const id = snap.docs[0]?.id
  if (!id) throw new Error("BUSINESS_REQUIRED")
  if (typeof window !== "undefined") window.sessionStorage.setItem("activeBusinessId", id)
  return id
}
