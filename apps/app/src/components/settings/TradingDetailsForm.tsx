"use client"

import { useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { TradingDetailsInput } from "@/lib/firebase/user-settings"

export type TradingDetailsFormValues = TradingDetailsInput

export function TradingDetailsForm({
  initial,
  submitLabel = "Save",
  onSubmit,
  onCancel,
  submitting = false,
  readOnly = false,
  hideActions = false,
}: {
  initial?: Partial<TradingDetailsFormValues>
  submitLabel?: string
  submitting?: boolean
  onSubmit: (data: TradingDetailsFormValues) => Promise<void> | void
  onCancel?: () => void
  readOnly?: boolean
  hideActions?: boolean
}) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    const values: TradingDetailsFormValues = {
      name: String(formData.get("name") || "").trim(),
      contactName: String(formData.get("contactName") || "").trim() || undefined,
      contactEmail: String(formData.get("contactEmail") || "").trim() || undefined,
      phone: String(formData.get("phone") || "").trim() || undefined,
      building: String(formData.get("addr_building") || "").trim() || undefined,
      street: String(formData.get("addr_street") || "").trim() || undefined,
      city: String(formData.get("addr_city") || "").trim() || undefined,
      area: String(formData.get("addr_area") || "").trim() || undefined,
      postcode: String(formData.get("addr_postcode") || "").trim() || undefined,
      country: String(formData.get("addr_country") || "").trim() || undefined,
    }
    Promise.resolve(onSubmit(values))
      .then(() => formRef.current?.reset())
      .finally(() => setIsSubmitting(false))
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid gap-6">
      <Card>
        <CardContent className="grid gap-5 grid-cols-1 md:grid-cols-3">
          <div className="md:col-span-3">
            <p className="text-sm font-medium text-muted-foreground">Trading details</p>
          </div>
          <div className="grid gap-2 md:col-span-3">
            <Label htmlFor="name">Trading/Business Name</Label>
            <Input id="name" name="name" required defaultValue={initial?.name} placeholder="e.g., Acme Events Ltd" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contactName">Contact name</Label>
            <Input id="contactName" name="contactName" defaultValue={initial?.contactName} placeholder="Jane Doe" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input id="contactEmail" name="contactEmail" defaultValue={initial?.contactEmail} placeholder="billing@acme.com" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" name="phone" defaultValue={initial?.phone} placeholder="+1 555 000 000" readOnly={readOnly} disabled={readOnly} />
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

      {!readOnly && !hideActions && (
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


