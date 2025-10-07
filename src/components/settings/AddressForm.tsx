"use client"

import { useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { AddressInput } from "@/lib/firebase/user-settings"

export type AddressFormValues = AddressInput

export function AddressForm({
  initial,
  submitLabel = "Save",
  onSubmit,
  onCancel,
  submitting = false,
  readOnly = false,
}: {
  initial?: Partial<AddressFormValues>
  submitLabel?: string
  submitting?: boolean
  onSubmit: (data: AddressFormValues) => Promise<void> | void
  onCancel?: () => void
  readOnly?: boolean
}) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    try {
      const values: AddressFormValues = {
        name: String(formData.get("name") || "").trim(),
        building: String(formData.get("addr_building") || "").trim() || undefined,
        street: String(formData.get("addr_street") || "").trim() || undefined,
        city: String(formData.get("addr_city") || "").trim() || undefined,
        area: String(formData.get("addr_area") || "").trim() || undefined,
        postcode: String(formData.get("addr_postcode") || "").trim() || undefined,
        country: String(formData.get("addr_country") || "").trim() || undefined,
      }
      await onSubmit(values)
      formRef.current?.reset()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid gap-6">
      <Card>
        <CardContent className="grid gap-5 grid-cols-1 md:grid-cols-3">
          <div className="md:col-span-3">
            <p className="text-sm font-medium text-muted-foreground">Address details</p>
          </div>
          <div className="grid gap-2 md:col-span-3">
            <Label htmlFor="name">Name for this address</Label>
            <Input id="name" name="name" required defaultValue={initial?.name} placeholder="e.g., Registered Office" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="md:col-span-3">
            <Separator className="my-1" />
            <p className="text-sm font-medium text-muted-foreground mt-2">Address</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_building">Building no/name</Label>
            <Input id="addr_building" name="addr_building" defaultValue={initial?.building} placeholder="221B" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_street">Street</Label>
            <Input id="addr_street" name="addr_street" defaultValue={initial?.street} placeholder="Baker Street" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_city">Town/City</Label>
            <Input id="addr_city" name="addr_city" defaultValue={initial?.city} placeholder="London" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_area">Area/County/State</Label>
            <Input id="addr_area" name="addr_area" defaultValue={initial?.area} placeholder="Greater London" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_postcode">Post/Zip code</Label>
            <Input id="addr_postcode" name="addr_postcode" defaultValue={initial?.postcode} placeholder="NW1 6XE" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_country">Country</Label>
            <Input id="addr_country" name="addr_country" defaultValue={initial?.country} placeholder="United Kingdom" readOnly={readOnly} disabled={readOnly} />
          </div>
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting || isSubmitting}>{submitLabel}</Button>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          ) : null}
        </div>
      )}
    </form>
  )
}


