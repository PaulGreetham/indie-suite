"use client"

import { ContractForm, type ContractFormValues } from "@/components/contracts/ContractForm"
import type { ContractInput } from "@/lib/firebase/contracts"
import { getFirestoreDb, getFirebaseAuth } from "@/lib/firebase/client"
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function CreateContractPage() {
  const router = useRouter()

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
          const currentUser = getFirebaseAuth().currentUser
          const uid = currentUser?.uid || ""
          if (!uid || !currentUser) { toast.error("Please sign in again"); return }
          const evtSnap = await getDoc(doc(db, "events", vals.eventId))
          if (!evtSnap.exists()) {
            toast.error("Event not found")
            return
          }
          const event = evtSnap.data() as { ownerId?: string; customerId?: string; venueId?: string; title?: string; businessId?: string }
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
          let invoiceId: string | null = null
          const invSnap = await getDocs(query(collection(db, "invoices"), where("ownerId", "==", uid), where("eventId", "==", vals.eventId), limit(1)))
          if (!invSnap.empty) {
            invoice = invSnap.docs[0].data() as Record<string, unknown>
            invoiceId = invSnap.docs[0].id
          }

          const terms = (vals.terms || []).map((t) => ({ text: t.text.trim() })).filter((t) => t.text.length > 0)
          const token = await currentUser.getIdToken()

          const res = await fetch("/api/contracts/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ eventId: vals.eventId, terms, notes: vals.notes || "", data: { event, customer, venue, invoice, invoiceId } }),
          })

          const body = (await res.json().catch(() => ({}))) as {
            firma?: { id?: string; url?: string; document_url?: string; firmaUrl?: string }
            recipients?: ContractInput["recipients"]
            contractData?: Record<string, string>
            relatedIds?: { customerId?: string | null; venueId?: string | null; invoiceId?: string | null; businessId?: string | null }
            eventTitle?: string
            error?: string
            message?: string
          }
          if (!res.ok) {
            toast.error(body?.message || body?.error || "Failed to generate contract")
            return
          }

          // Save a contract record client-side
          const eventTitle = body.eventTitle || event.title || vals.eventId
          const payload: ContractInput = {
            title: `Contract - ${eventTitle}`,
            eventId: vals.eventId,
            customerId: body.relatedIds?.customerId || event.customerId,
            venueId: body.relatedIds?.venueId || event.venueId,
            invoiceId: body.relatedIds?.invoiceId || invoiceId || undefined,
            terms,
            notes: vals.notes || "",
            status: "draft",
            recipients: body.recipients,
            firmaId: body.firma?.id,
            firmaUrl: body.firma?.firmaUrl || body.firma?.url || body.firma?.document_url,
            businessId: body.relatedIds?.businessId || event.businessId,
            contractData: body.contractData,
          }
          const createRes = await fetch("/api/contracts/create", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          })
          const createBody = (await createRes.json().catch(() => ({}))) as { id?: string; error?: string; message?: string }
          if (!createRes.ok) {
            toast.error(createBody.message || createBody.error || "Contract generated, but failed to save")
            return
          }
          toast.success("Contract generated")
          if (createBody.id) router.push(`/contracts/${createBody.id}`)
        }}
      />
    </div>
  )
}


