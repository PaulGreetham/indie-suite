"use client"

import { useState } from "react"
import { createEvent, type EventInput } from "@/lib/firebase/events"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { ChevronDownIcon } from "lucide-react"
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

function DateTimeField({ label, name, value, onChange, required }: { label: string; name: string; value?: Date; onChange: (d?: Date) => void; required?: boolean }) {
  const today = new Date()
  const fromYear = today.getFullYear()
  const toYear = fromYear + 10
  const [open, setOpen] = useState(false)
  const [time, setTime] = useState<string>(() => {
    if (!value) return "10:30:00"
    const hh = String(value.getHours()).padStart(2, "0")
    const mm = String(value.getMinutes()).padStart(2, "0")
    const ss = String(value.getSeconds()).padStart(2, "0")
    return `${hh}:${mm}:${ss}`
  })

  function merge(date?: Date, timeStr?: string) {
    if (!date) return undefined
    const d = new Date(date)
    const [hh = "00", mm = "00", ss = "00"] = (timeStr ?? time).split(":")
    d.setHours(Number(hh))
    d.setMinutes(Number(mm))
    d.setSeconds(Number(ss))
    d.setMilliseconds(0)
    return d
  }

  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <input type="hidden" name={name} value={value ? merge(value)!.toISOString() : ""} />
      <div className="flex gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${name}-date`} className="px-1">Date</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" id={`${name}-date`} className="w-full justify-between font-normal">
                {value ? value.toLocaleDateString() : "Select date"}
                <ChevronDownIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <Calendar
                mode="single"
                selected={value}
                captionLayout="dropdown"
                fromYear={fromYear}
                toYear={toYear}
                disabled={{ before: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }}
                onSelect={(d) => { onChange(merge(d)); setOpen(false) }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${name}-time`} className="px-1">Time</Label>
          <Input
            type="time"
            id={`${name}-time`}
            step={60}
            value={time}
            onChange={(e) => { setTime(e.target.value); if (value) onChange(merge(value, e.target.value)) }}
            className="bg-background w-full appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
      </div>
      {required && !value ? <span className="text-xs text-muted-foreground">Required</span> : null}
    </div>
  )
}


