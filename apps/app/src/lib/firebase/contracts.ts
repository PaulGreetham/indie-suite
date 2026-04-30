import { addDoc, collection, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { buildContractCreatePayload, buildContractUpdatePayload } from "@/lib/contracts/firestore-payload"
export type { ContractInput, ContractRecipient, ContractTerm } from "@/lib/contracts/types"
import { getFirestoreDb, getFirebaseAuth } from "./client"

import type { ContractInput } from "@/lib/contracts/types"

export async function createContract(input: ContractInput): Promise<string> {
  const db = getFirestoreDb()
  const uid = getFirebaseAuth().currentUser?.uid
  if (!uid) throw new Error("AUTH_REQUIRED")
  const col = collection(db, "contracts")
  const payload = buildContractCreatePayload(input, uid, serverTimestamp())
  const ref = await addDoc(col, payload)
  return ref.id
}

export async function updateContract(id: string, updates: Partial<ContractInput>): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "contracts", id)
  const payload = buildContractUpdatePayload(updates)
  await updateDoc(ref, payload as Record<string, unknown>)
}

export async function deleteContract(id: string): Promise<void> {
  const db = getFirestoreDb()
  const ref = doc(db, "contracts", id)
  await deleteDoc(ref)
}


