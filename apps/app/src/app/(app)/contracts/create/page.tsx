"use client"

import { ContractForm, type ContractFormValues } from "@/components/contracts/ContractForm"
import { getFirebaseAuth } from "@/lib/firebase/client"
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
          const currentUser = getFirebaseAuth().currentUser
          if (!currentUser) { toast.error("Please sign in again"); return }

          const terms = (vals.terms || []).map((t) => ({ text: t.text.trim() })).filter((t) => t.text.length > 0)
          const token = await currentUser.getIdToken()

          // The server loads the event, creates the Firma signing request and saves the contract
          const res = await fetch("/api/contracts/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ eventId: vals.eventId, terms, notes: vals.notes || "" }),
          })
          const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string; message?: string }
          if (!res.ok) {
            toast.error(body?.message || body?.error || "Failed to generate contract")
            return
          }
          toast.success("Contract generated")
          if (body.id) router.push(`/contracts/${body.id}`)
        }}
      />
    </div>
  )
}


