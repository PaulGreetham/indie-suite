"use client"

import { useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export type AccountFormValues = {
  fullName: string
  email: string
  phone?: string
  company?: string
  website?: string
  address?: {
    building?: string
    street?: string
    city?: string
    area?: string
    postcode?: string
    country?: string
  }
}

export function AccountForm({
  initial,
  submitLabel = "Save",
  onSubmit,
  onCancel,
  submitting = false,
}: {
  initial?: Partial<AccountFormValues>
  submitLabel?: string
  submitting?: boolean
  onSubmit: (data: AccountFormValues) => Promise<void> | void
  onCancel?: () => void
}) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    const values: AccountFormValues = {
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
            <p className="text-sm font-medium text-muted-foreground">Profile</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" required defaultValue={initial?.fullName} placeholder="Jane Doe" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required defaultValue={initial?.email} placeholder="jane@example.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={initial?.phone} placeholder="+1 555 000 000" />
          </div>

          <div className="md:col-span-3">
            <Separator className="my-1" />
            <p className="text-sm font-medium text-muted-foreground mt-2">Business</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" name="company" defaultValue={initial?.company} placeholder="Acme Inc" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" defaultValue={initial?.website} placeholder="https://example.com" />
          </div>

          <div className="md:col-span-3">
            <Separator className="my-1" />
            <p className="text-sm font-medium text-muted-foreground mt-2">Address</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_building">Building</Label>
            <Input id="addr_building" name="addr_building" defaultValue={initial?.address?.building} placeholder="221B" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_street">Street</Label>
            <Input id="addr_street" name="addr_street" defaultValue={initial?.address?.street} placeholder="Baker Street" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_city">City</Label>
            <Input id="addr_city" name="addr_city" defaultValue={initial?.address?.city} placeholder="London" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_area">Area/County/State</Label>
            <Input id="addr_area" name="addr_area" defaultValue={initial?.address?.area} placeholder="Greater London" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_postcode">Post/Zip code</Label>
            <Input id="addr_postcode" name="addr_postcode" defaultValue={initial?.address?.postcode} placeholder="NW1 6XE" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="addr_country">Country</Label>
            <Input id="addr_country" name="addr_country" defaultValue={initial?.address?.country} placeholder="United Kingdom" />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting || isSubmitting}>{submitLabel}</Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        ) : null}
      </div>
    </form>
  )
}


