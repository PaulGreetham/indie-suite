import { doc, updateDoc, deleteDoc } from "firebase/firestore"
import { buildContractUpdatePayload } from "@/lib/contracts/firestore-payload"
export type { ContractInput, ContractRecipient, ContractTerm } from "@/lib/contracts/types"
import { getFirestoreDb } from "./client"

import type { ContractInput } from "@/lib/contracts/types"

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


