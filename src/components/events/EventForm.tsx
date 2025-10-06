"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, type SelectOption } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronDownIcon } from "lucide-react"
import { getFirestoreDb } from "@/lib/firebase/client"
import { collection, getDocs, orderBy, query } from "firebase/firestore"

export type EventFormValues = {
  title: string
  startsAt?: Date
  endsAt?: Date
  customerId?: string
  venueId?: string
  notes?: string
}

export function EventForm({
  initial,
  submitLabel = "Save",
  onSubmit,
  onCancel,
  submitting = false,
}: {
  initial?: Partial<EventFormValues>
  submitLabel?: string
  submitting?: boolean
  onSubmit: (data: EventFormValues) => Promise<void> | void
  onCancel?: () => void
}) {
  const [values, setValues] = useState<EventFormValues>({
    title: initial?.title ?? "",
    startsAt: initial?.startsAt,
    endsAt: initial?.endsAt,
    customerId: initial?.customerId,
    venueId: initial?.venueId,
    notes: initial?.notes ?? "",
  })
  const [customers, setCustomers] = useState<SelectOption[]>([])
  const [venues, setVenues] = useState<SelectOption[]>([])

  useEffect(() => {
    async function load() {
      const db = getFirestoreDb()
      const [cSnap, vSnap] = await Promise.all([
        getDocs(query(collection(db, "customers"), orderBy("fullNameLower", "asc"))),
        getDocs(query(collection(db, "venues"), orderBy("nameLower", "asc"))),
      ])
      setCustomers(
        cSnap.docs.map((d) => {
          const v = d.data() as { fullName?: string; company?: string }
          return { value: d.id, label: String(v.fullName || v.company || "") }
        })
      )
      setVenues(
        vSnap.docs.map((d) => {
          const v = d.data() as { name?: string }
          return { value: d.id, label: String(v.name || "") }
        })
      )
    }
    load().catch(() => { setCustomers([]); setVenues([]) })
  }, [])

  return (
    <form
      className="grid gap-6"
      onSubmit={async (e) => {
        e.preventDefault()
        await onSubmit(values)
      }}
    >
      <Card>
        <CardContent className="grid gap-5 grid-cols-1 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">Event details</p>
          </div>

          <div className="md:col-span-2 grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))} placeholder="e.g., Wedding Reception" required />
          </div>

          <DateTimeField
            label="Start Date"
            value={values.startsAt}
            onChange={(d) => setValues((v) => ({ ...v, startsAt: d }))}
          />
          <DateTimeField
            label="End Date"
            value={values.endsAt}
            onChange={(d) => setValues((v) => ({ ...v, endsAt: d }))}
          />

          <div className="grid gap-2">
            <Label>Customer</Label>
            <Select
              value={values.customerId}
              onChange={(val) => setValues((v) => ({ ...v, customerId: val }))}
              options={customers}
              placeholder="Select customer"
            />
          </div>
          <div className="grid gap-2">
            <Label>Venue</Label>
            <Select
              value={values.venueId}
              onChange={(val) => setValues((v) => ({ ...v, venueId: val }))}
              options={venues}
              placeholder="Select venue"
            />
          </div>

          <div className="md:col-span-2 grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} placeholder="Optional details" />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}> {submitLabel} </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        ) : null}
      </div>
    </form>
  )
}

function DateTimeField({ label, value, onChange }: { label: string; value?: Date; onChange: (d?: Date) => void }) {
  const today = useMemo(() => new Date(), [])
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
    <div className="grid gap-2">
      <Label className="px-1">{label}</Label>
      <div className="flex gap-4">
        <div className="flex flex-col gap-2 w-full">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between font-normal">
                {value ? value.toLocaleDateString() : "Select date"}
                <ChevronDownIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0 bg-popover border rounded-md shadow-md" align="start">
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
        <div className="flex flex-col gap-2 w-full">
          <Input
            type="time"
            step={60}
            value={time}
            onChange={(e) => { setTime(e.target.value); if (value) onChange(merge(value, e.target.value)) }}
            className="bg-background w-full appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
      </div>
      {/* helper text intentionally omitted */}
    </div>
  )
}


