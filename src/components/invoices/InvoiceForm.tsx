"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { createInvoice, type InvoiceInput } from "@/lib/firebase/invoices"

type Props = {
  onCreated?: (id: string) => void
}

type LineItem = { id: string; description: string; quantity: number; unit_price: number }

export default function InvoiceForm({ onCreated }: Props) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [lineItems, setLineItems] = React.useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0 },
  ])
  const [saving, setSaving] = React.useState(false)

  function addRow() {
    setLineItems((prev) => [...prev, { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0 }])
  }
  function removeRow(id: string) {
    setLineItems((prev) => prev.filter((r) => r.id !== id))
  }
  function updateRow(id: string, patch: Partial<LineItem>) {
    setLineItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function handleSubmit(formData: FormData) {
    setSaving(true)
    try {
      const payload: InvoiceInput = {
        invoice_number: String(formData.get("invoice_number") || "").trim(),
        issue_date: String(formData.get("issue_date") || ""),
        due_date: String(formData.get("due_date") || ""),
        user_business_name: String(formData.get("user_business_name") || "").trim(),
        user_email: String(formData.get("user_email") || "").trim(),
        customer_name: String(formData.get("customer_name") || "").trim(),
        customer_email: String(formData.get("customer_email") || "").trim(),
        line_items: lineItems.map(({ description, quantity, unit_price }) => ({ description, quantity, unit_price })),
        notes: String(formData.get("notes") || "").trim() || undefined,
        payment_link: String(formData.get("payment_link") || "").trim() || undefined,
      }
      const id = await createInvoice(payload)
      onCreated?.(id)
      formRef.current?.reset()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid gap-6">
      <Card>
        <CardContent className="grid gap-5 grid-cols-1 md:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="invoice_number">Invoice Number</Label>
            <Input id="invoice_number" name="invoice_number" placeholder="INV-2025-001" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="issue_date">Issue Date</Label>
            <Input id="issue_date" name="issue_date" type="date" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input id="due_date" name="due_date" type="date" required />
          </div>

          <Separator className="col-span-full" />

          <div className="grid gap-2">
            <Label htmlFor="user_business_name">Your Business</Label>
            <Input id="user_business_name" name="user_business_name" placeholder="Acme Consulting" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="user_email">Your Email</Label>
            <Input id="user_email" name="user_email" type="email" placeholder="alex@acme.com" required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="customer_name">Customer Name</Label>
            <Input id="customer_name" name="customer_name" placeholder="Jane Doe" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer_email">Customer Email</Label>
            <Input id="customer_email" name="customer_email" type="email" placeholder="jane@example.com" required />
          </div>

          <Separator className="col-span-full" />

          <div className="col-span-full">
            <div className="mb-2 text-sm font-medium">Line Items</div>
            <div className="grid gap-3">
              {lineItems.map((row) => (
                <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-6">
                    <Label className="sr-only">Description</Label>
                    <Input
                      placeholder="Description"
                      value={row.description}
                      onChange={(e) => updateRow(row.id, { description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="sr-only">Quantity</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, { quantity: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label className="sr-only">Unit Price</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.unit_price}
                      onChange={(e) => updateRow(row.id, { unit_price: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Button type="button" variant="destructive" onClick={() => removeRow(row.id)} aria-label="Remove line item">
                      ×
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Button type="button" variant="secondary" onClick={addRow}>Add line item</Button>
              </div>
            </div>
          </div>

          <Separator className="col-span-full" />

          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="payment_link">Payment Link</Label>
            <Input id="payment_link" name="payment_link" placeholder="https://pay.stripe.com/..." />
          </div>
          <div className="grid gap-2 md:col-span-3">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" placeholder="Thanks for your business." rows={4} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Invoice"}</Button>
      </div>
    </form>
  )
}


