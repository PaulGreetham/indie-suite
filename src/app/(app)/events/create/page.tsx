"use client"

import { createEvent, type EventInput } from "@/lib/firebase/events"
import { EventForm, type EventFormValues } from "@/components/events/EventForm"
import { toast } from "sonner"

export default function AddEventPage() {
  // All fetching and validation is handled by EventForm

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">Create Event</h1>
      <EventForm
        submitLabel="Save"
        onSubmit={async (vals: EventFormValues) => {
          const payload: EventInput = {
            title: vals.title,
            startsAt: (vals.startsAt ?? new Date()).toISOString(),
            endsAt: vals.endsAt ? vals.endsAt.toISOString() : undefined,
            notes: vals.notes,
            customerId: vals.customerId ?? "",
            venueId: vals.venueId ?? "",
          }
          if (!payload.customerId || !payload.venueId) {
            toast.error("Please select customer and venue")
            return
          }
          await createEvent(payload)
          toast.success("Event created")
        }}
      />
    </div>
  )
}
