"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, where } from "firebase/firestore"
import { VenueForm, type VenueFormValues } from "@/components/venues/VenueForm"
import { createVenue } from "@/lib/firebase/venues"
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client"
import { toast } from "sonner"
import { useBusiness } from "@/lib/business-context"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { clientLabel } from "@/lib/client-label"

type ClientDetails = { id: string; label: string; details: Partial<VenueFormValues> }

const hasText = (value: unknown) => typeof value === "string" && value.trim().length > 0

// Clients of the active business with an address, phone or website, so those can be reused for a venue
async function loadClientDetails(businessId: string): Promise<ClientDetails[]> {
  const uid = getFirebaseAuth().currentUser?.uid
  if (!uid) return []
  const snap = await getDocs(query(
    collection(getFirestoreDb(), "customers"),
    where("ownerId", "==", uid),
    where("businessId", "==", businessId),
  ))
  return snap.docs
    .map((d) => {
      const v = d.data() as {
        company?: string | null
        fullName?: string
        phone?: string | null
        website?: string | null
        address?: VenueFormValues["address"] | null
      }
      const label = clientLabel(v)
      const details: Partial<VenueFormValues> = {
        name: label,
        phone: v.phone ?? undefined,
        website: v.website ?? undefined,
        address: v.address ?? undefined,
      }
      return { id: d.id, label, details }
    })
    .filter(({ details }) =>
      hasText(details.phone) || hasText(details.website) || Object.values(details.address ?? {}).some(hasText))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export default function CreateVenuePage() {
  const router = useRouter()
  const { resolveActiveBusinessId } = useBusiness()
  const [clients, setClients] = React.useState<ClientDetails[]>([])
  const [copiedFrom, setCopiedFrom] = React.useState<string>("")

  React.useEffect(() => {
    resolveActiveBusinessId()
      .then(loadClientDetails)
      .then(setClients)
      .catch(() => setClients([]))
  }, [resolveActiveBusinessId])

  const copied = clients.find((c) => c.id === copiedFrom)

  async function handleSubmit(values: VenueFormValues) {
    const businessId = await resolveActiveBusinessId()
    await createVenue({
      name: values.name,
      phone: values.phone,
      website: values.website,
      address: values.address,
      notes: values.notes,
      businessId,
    })
    toast.success("Venue saved successfully", { duration: 3500 })
    setCopiedFrom("")
  }

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">Create Venue</h1>
      {clients.length > 0 ? (
        <div className="mb-6 grid max-w-sm gap-2">
          <Label>Copy details from a client (optional)</Label>
          <Select
            value={copiedFrom}
            onChange={setCopiedFrom}
            options={clients.map((c) => ({ value: c.id, label: c.label }))}
            placeholder="Choose a client"
          />
          <p className="text-xs text-muted-foreground">Fills in the name, phone, website and address below. You can change them before saving.</p>
        </div>
      ) : null}
      {/* Remounted when a client is chosen so the uncontrolled fields take the copied values */}
      <VenueForm
        key={copiedFrom || "blank"}
        initial={copied?.details}
        submitLabel="Save"
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </div>
  )
}
