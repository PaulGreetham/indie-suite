"use client"

import { useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export type CustomerFormValues = {
  company?: string
  fullName: string
  email: string
  phone?: string
  website?: string
  address?: {
    building?: string
    street?: string
    city?: string
    area?: string
    postcode?: string
    country?: string
  }
  notes?: string
}

export function CustomerForm({
  initial,
  submitLabel = "Save",
  onSubmit,
  onCancel,
  submitting = false,
  readOnly = false,
}: {
  initial?: Partial<CustomerFormValues>
  submitLabel?: string
  submitting?: boolean
  onSubmit: (data: CustomerFormValues) => Promise<void> | void
  onCancel?: () => void
  readOnly?: boolean
}) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    try {
      const values: CustomerFormValues = {
        fullName: String(formData.get("fullName") || "").trim(),
        company: String(formData.get("company") || "").trim() || undefined,
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim() || undefined,
        website: (() => {
          const raw = String(formData.get("website") || "").trim()
          if (!raw) return undefined
          return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
        })(),
        address: {
          building: String(formData.get("addr_building") || "").trim() || undefined,
          street: String(formData.get("addr_street") || "").trim() || undefined,
          city: String(formData.get("addr_city") || "").trim() || undefined,
          area: String(formData.get("addr_area") || "").trim() || undefined,
          postcode: String(formData.get("addr_postcode") || "").trim() || undefined,
          country: String(formData.get("addr_country") || "").trim() || undefined,
        },
        notes: String(formData.get("notes") || "").trim() || undefined,
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
          {/* Section: Customer details */}
          <div className="md:col-span-3">
            <p className="text-sm font-medium text-muted-foreground">Customer details</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company">Company name</Label>
            <Input id="company" name="company" defaultValue={initial?.company} placeholder="Acme Inc" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fullName">Contact name</Label>
            <Input id="fullName" name="fullName" required defaultValue={initial?.fullName} placeholder="Jane Doe" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required defaultValue={initial?.email} placeholder="jane@example.com" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={initial?.phone} placeholder="+1 555 000 000" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" type="text" defaultValue={initial?.website} placeholder="https://example.com" readOnly={readOnly} disabled={readOnly} />
          </div>
          
          {/* Section: Address */}
          <div className="md:col-span-3">
            <Separator className="my-1" />
            <p className="text-sm font-medium text-muted-foreground mt-2">Address</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_building">Building no/name</Label>
            <Input id="addr_building" name="addr_building" defaultValue={initial?.address?.building} placeholder="221B" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_street">Street</Label>
            <Input id="addr_street" name="addr_street" defaultValue={initial?.address?.street} placeholder="Baker Street" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_city">Town/City</Label>
            <Input id="addr_city" name="addr_city" defaultValue={initial?.address?.city} placeholder="London" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_area">Area/County/State</Label>
            <Input id="addr_area" name="addr_area" defaultValue={initial?.address?.area} placeholder="Greater London" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_postcode">Post/Zip code</Label>
            <Input id="addr_postcode" name="addr_postcode" defaultValue={initial?.address?.postcode} placeholder="NW1 6XE" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_country">Country</Label>
            <Input id="addr_country" name="addr_country" defaultValue={initial?.address?.country} placeholder="United Kingdom" readOnly={readOnly} disabled={readOnly} />
          </div>
          
          <div className="md:col-span-3">
            <Separator className="my-1" />
          </div>
          <div className="grid gap-2 md:col-span-3">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" defaultValue={initial?.notes} placeholder="e.g., Always wants printed invoice" readOnly={readOnly} disabled={readOnly} />
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


