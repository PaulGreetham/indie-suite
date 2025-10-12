"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, type SelectOption } from "@/components/ui/select"
import { getFirestoreDb } from "@/lib/firebase/client"
import { collection, getDocs, orderBy, query, where } from "firebase/firestore"

type TermRow = { id: string; text: string }

export type ContractFormValues = {
  eventId?: string
  terms?: TermRow[]
}

export function ContractForm({
  initial,
  submitLabel = "Save",
  onSubmit,
  onCancel,
  submitting = false,
  readOnly = false,
}: {
  initial?: Partial<ContractFormValues>
  submitLabel?: string
  submitting?: boolean
  onSubmit: (data: ContractFormValues) => Promise<void> | void
  onCancel?: () => void
  readOnly?: boolean
}) {
  const [values, setValues] = React.useState<ContractFormValues>({
    eventId: initial?.eventId,
    terms: Array.isArray(initial?.terms) ? (initial?.terms as TermRow[]) : [{ id: crypto.randomUUID(), text: "" }],
  })
  const [eventOptions, setEventOptions] = React.useState<SelectOption[]>([])

  React.useEffect(() => {
    async function loadEvents() {
      try {
        const db = getFirestoreDb()
        const { getFirebaseAuth } = await import("@/lib/firebase/client")
        const uid = getFirebaseAuth().currentUser?.uid || "__NONE__"
        const snap = await getDocs(query(collection(db, "events"), where("ownerId", "==", uid), orderBy("startsAt", "desc")))
        const opts: SelectOption[] = snap.docs.map((d) => {
          const v = d.data() as { title?: string; startsAt?: string }
          const datePart = v.startsAt ? new Date(v.startsAt).toLocaleDateString() : ""
          const label = [v.title, datePart].filter(Boolean).join(" · ") || d.id
          return { value: d.id, label }
        })
        setEventOptions(opts)
      } catch {
        setEventOptions([])
      }
    }
    loadEvents()
  }, [])

  function addTermRow() {
    setValues((v) => ({ ...v, terms: [...(v.terms || []), { id: crypto.randomUUID(), text: "" }] }))
  }
  function removeTermRow(id: string) {
    setValues((v) => ({ ...v, terms: (v.terms || []).filter((t) => t.id !== id) }))
  }
  function updateTermRow(id: string, text: string) {
    setValues((v) => ({ ...v, terms: (v.terms || []).map((t) => (t.id === id ? { ...t, text } : t)) }))
  }

  return (
    <form
      className="grid gap-6"
      onSubmit={async (e) => {
        e.preventDefault()
        await onSubmit(values)
      }}
    >
      <Card>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label>Event</Label>
            <Select
              value={values.eventId}
              onChange={(id) => setValues((v) => ({ ...v, eventId: String(id || "") || undefined }))}
              options={eventOptions}
              placeholder="Select event"
              disabled={readOnly}
              prefixItems={[{ label: "Create Event", href: "/events/create" }]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Terms rows */}
      <Card>
        <CardContent className="grid gap-3">
          <div className="mb-2 text-sm font-medium">Terms</div>
          <div className="grid gap-2">
            {(values.terms || []).map((row) => (
              <div key={row.id} className="grid grid-cols-1 lg:grid-cols-24 gap-2 items-end">
                <div className="lg:col-span-22">
                  <Label className="sr-only">Term</Label>
                  <Input placeholder="e.g., 50% deposit on order" value={row.text} onChange={(e) => updateTermRow(row.id, e.target.value)} disabled={readOnly} />
                </div>
                <div className="lg:col-span-2">
                  {!readOnly && (
                    <Button type="button" variant="destructive" onClick={() => removeTermRow(row.id)} aria-label="Remove term">×</Button>
                  )}
                </div>
              </div>
            ))}
            {!readOnly && (
              <div>
                <Button type="button" variant="secondary" onClick={addTermRow}>Add term</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Optional freeform notes for additional info */}
      <Card>
        <CardContent className="grid gap-3">
          <Label htmlFor="notes">Additional notes (optional)</Label>
          <Textarea id="notes" rows={6} placeholder="Any extra clauses or info" disabled={readOnly} />
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>{submitLabel}</Button>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          ) : null}
        </div>
      )}
    </form>
  )
}


