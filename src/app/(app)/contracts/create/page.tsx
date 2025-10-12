"use client"

import { ContractForm, type ContractFormValues } from "@/components/contracts/ContractForm"
import { createContract, type ContractInput } from "@/lib/firebase/contracts"
import { getFirestoreDb, getFirebaseAuth } from "@/lib/firebase/client"
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore"
import { toast } from "sonner"

export default function CreateContractPage() {
  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">Create Contract</h1>
      <ContractForm
        submitLabel="Generate"
        onSubmit={async (vals: ContractFormValues) => {
          if (!vals.eventId) {
            toast.error("Select an event")
            return
          }

          // Load related data with client SDK (no Admin required)
          const db = getFirestoreDb()
          const uid = getFirebaseAuth().currentUser?.uid || ""
          if (!uid) { toast.error("Please sign in again"); return }
          const evtSnap = await getDoc(doc(db, "events", vals.eventId))
          if (!evtSnap.exists()) {
            toast.error("Event not found")
            return
          }
          const event = evtSnap.data() as { ownerId?: string; customerId?: string; venueId?: string }
          if (String(event.ownerId || "") !== uid) { toast.error("You don't have access to this event"); return }

          let customer: Record<string, unknown> | null = null
          if (event.customerId) {
            const c = await getDoc(doc(db, "customers", String(event.customerId)))
            if (c.exists()) customer = c.data() as Record<string, unknown>
          }

          let venue: Record<string, unknown> | null = null
          if (event.venueId) {
            const v = await getDoc(doc(db, "venues", String(event.venueId)))
            if (v.exists()) venue = v.data() as Record<string, unknown>
          }

          let invoice: Record<string, unknown> | null = null
          const invSnap = await getDocs(query(collection(db, "invoices"), where("ownerId", "==", uid), where("eventId", "==", vals.eventId), limit(1)))
          if (!invSnap.empty) invoice = invSnap.docs[0].data() as Record<string, unknown>

          const terms = (vals.terms || []).map((t) => ({ text: t.text.trim() })).filter((t) => t.text.length > 0)

          const res = await fetch("/api/contracts/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId: vals.eventId, terms, data: { event, customer, venue, invoice } }),
          })

          const body = (await res.json().catch(() => ({}))) as { firma?: { id?: string; url?: string }; error?: string; message?: string }
          if (!res.ok) {
            toast.error(body?.error || body?.message || "Failed to generate contract")
            return
          }

          // Save a contract record client-side
          const payload: ContractInput = {
            title: `Contract`,
            eventId: vals.eventId,
            terms,
            status: "draft",
            firmaId: body.firma?.id,
            firmaUrl: body.firma?.url,
          }
          await createContract(payload)
          toast.success("Contract generated")
        }}
      />
    </div>
  )
}


