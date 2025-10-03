"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { createCustomer } from "@/lib/firebase/customers"

export default function AddCustomerPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    setError(null)
    try {
      const fullName = String(formData.get("fullName") || "").trim()
      const email = String(formData.get("email") || "").trim()
      if (!fullName || !email) {
        throw new Error("Full name and email are required")
      }

      const id = await createCustomer({
        fullName,
        company: String(formData.get("company") || "").trim() || undefined,
        email,
        phone: String(formData.get("phone") || "").trim() || undefined,
        website: String(formData.get("website") || "").trim() || undefined,
        address: {
          building: String(formData.get("addr_building") || "").trim() || undefined,
          street: String(formData.get("addr_street") || "").trim() || undefined,
          city: String(formData.get("addr_city") || "").trim() || undefined,
          area: String(formData.get("addr_area") || "").trim() || undefined,
          postcode: String(formData.get("addr_postcode") || "").trim() || undefined,
          country: String(formData.get("addr_country") || "").trim() || undefined,
        },
        preferredContact: (String(formData.get("preferredContact") || "") || undefined) as
          | "email"
          | "phone"
          | "other"
          | undefined,
        notes: String(formData.get("notes") || "").trim() || undefined,
      })

      router.push(`/customers/all`)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create customer"
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">Create Customer</h1>
      <form action={handleSubmit} className="grid gap-6">
        <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {/* Row 1: Company / Contact name */}
            <div className="grid gap-2">
              <Label htmlFor="company">Company name</Label>
              <Input id="company" name="company" placeholder="Acme Inc" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fullName">Contact name<span className="text-destructive"> *</span></Label>
              <Input id="fullName" name="fullName" required placeholder="Jane Doe" />
            </div>

            {/* Row 2: Email / Phone */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email<span className="text-destructive"> *</span></Label>
              <Input id="email" name="email" type="email" required placeholder="jane@example.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" name="phone" type="tel" placeholder="+1 555 000 000" />
            </div>

            {/* Website */}
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" placeholder="https://example.com" />
            </div>

            {/* Row 3+: Address fields */}
            <div className="grid gap-2 sm:col-span-2">
              <Label>Address</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="addr_building" className="text-muted-foreground">Building no/name</Label>
                  <Input id="addr_building" name="addr_building" placeholder="221B" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="addr_street" className="text-muted-foreground">Street</Label>
                  <Input id="addr_street" name="addr_street" placeholder="Baker Street" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="addr_city" className="text-muted-foreground">Town/City</Label>
                  <Input id="addr_city" name="addr_city" placeholder="London" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="addr_area" className="text-muted-foreground">Area/County/State</Label>
                  <Input id="addr_area" name="addr_area" placeholder="Greater London" />
                </div>
                <div className="grid gap-2 sm:max-w-xs">
                  <Label htmlFor="addr_postcode" className="text-muted-foreground">Post/Zip code</Label>
                  <Input id="addr_postcode" name="addr_postcode" placeholder="NW1 6XE" />
                </div>
                <div className="grid gap-2 sm:max-w-xs">
                  <Label htmlFor="addr_country" className="text-muted-foreground">Country</Label>
                  <Input id="addr_country" name="addr_country" placeholder="United Kingdom" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid gap-4">
            <div className="grid gap-2 sm:max-w-xs">
              <Label>Preferred contact method</Label>
              <Select
                options={[
                  { value: "", label: "No preference" },
                  { value: "email", label: "Email" },
                  { value: "phone", label: "Phone" },
                  { value: "other", label: "Other" },
                ]}
                onChange={(v) => {
                  const hidden = document.getElementById("preferredContact") as HTMLInputElement | null
                  if (hidden) hidden.value = v
                }}
                placeholder="Choose method"
              />
              <input type="hidden" id="preferredContact" name="preferredContact" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" placeholder="e.g., Always wants printed invoice" />
            </div>
          </CardContent>
        </Card>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Customer"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}


