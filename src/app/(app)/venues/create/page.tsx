"use client"

import { useRouter } from "next/navigation"
import { VenueForm, type VenueFormValues } from "@/components/venues/VenueForm"

export default function CreateVenuePage() {
  const router = useRouter()

  async function handleSubmit(values: VenueFormValues) {
    // TODO: wire up to persistence once venues backend exists
    console.log("Venue values", values)
  }

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">Create Venue</h1>
      <VenueForm submitLabel="Save" onSubmit={handleSubmit} onCancel={() => router.back()} />
    </div>
  )
}



