"use client"

import { useRouter } from "next/navigation"
import { VenueForm, type VenueFormValues } from "@/components/venues/VenueForm"
import { createVenue } from "@/lib/firebase/venues"
import { toast } from "sonner"

export default function CreateVenuePage() {
  const router = useRouter()

  async function handleSubmit(values: VenueFormValues) {
    await createVenue({
      name: values.name,
      phone: values.phone,
      website: values.website,
      address: values.address,
      notes: values.notes,
    })
    toast.success("Venue saved successfully", { duration: 3500 })
  }

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">Create Venue</h1>
      <VenueForm submitLabel="Save" onSubmit={handleSubmit} onCancel={() => router.back()} />
    </div>
  )
}



