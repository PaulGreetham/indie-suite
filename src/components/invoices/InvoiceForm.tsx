"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { createInvoice, type InvoiceInput } from "@/lib/firebase/invoices"
import { getFirestoreDb } from "@/lib/firebase/client"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { Select, type SelectOption } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronDownIcon } from "lucide-react"

type Props = {
  onCreated?: (id: string) => void
}

type LineItem = { id: string; description: string; quantity: number; unit_price: number }
type Payment = { id: string; name?: string; reference?: string; invoice_number?: string; currency?: string; due_date: string; amount: string }

export default function InvoiceForm({ onCreated }: Props) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [lineItems, setLineItems] = React.useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0 },
  ])
  const [payments, setPayments] = React.useState<Payment[]>([
    { id: crypto.randomUUID(), name: "Final payment", reference: "", invoice_number: "", currency: "GBP", due_date: "", amount: "" },
  ])
  const [saving, setSaving] = React.useState(false)
  const [events, setEvents] = React.useState<{ id: string; title: string; startsAt?: string }[]>([])
  const [eventId, setEventId] = React.useState<string>("")

  React.useEffect(() => {
    async function loadEvents() {
      const db = getFirestoreDb()
      const snap = await getDocs(query(collection(db, "events"), orderBy("startsAt", "desc")))
      setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as { title: string; startsAt?: string }) })))
    }
    loadEvents().catch(() => setEvents([]))
  }, [])

  function addRow() {
    setLineItems((prev) => [...prev, { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0 }])
  }
  function removeRow(id: string) {
    setLineItems((prev) => prev.filter((r) => r.id !== id))
  }
  function updateRow(id: string, patch: Partial<LineItem>) {
    setLineItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function addPayment() {
    setPayments((prev) => [...prev, { id: crypto.randomUUID(), name: "", reference: "", invoice_number: "", currency: "GBP", due_date: "", amount: "" }])
  }
  function removePayment(id: string) {
    setPayments((prev) => prev.filter((p) => p.id !== id))
  }
  function updatePayment(id: string, patch: Partial<Payment>) {
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const toNumber = (s?: string) => {
    if (!s) return 0
    const n = parseFloat(String(s).replace(/,/g, "."))
    return Number.isFinite(n) ? n : 0
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
        payments: payments
          .filter((p) => p.name || p.due_date || p.amount)
          .map(({ name, due_date, amount, reference, invoice_number, currency }) => ({ name: name || "", due_date: due_date || "", amount: toNumber(amount), reference, invoice_number, currency })),
        notes: String(formData.get("notes") || "").trim() || undefined,
        payment_link: String(formData.get("payment_link") || "").trim() || undefined,
        eventId: eventId || undefined,
      }
      const id = await createInvoice(payload)
      onCreated?.(id)
      formRef.current?.reset()
      setLineItems([{ id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0 }])
      setPayments([{ id: crypto.randomUUID(), name: "Final payment", reference: "", invoice_number: "", currency: "GBP", due_date: "", amount: "" }])
      setEventId("")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid gap-6">
      <Tabs defaultValue="single" className="w-full">
        <TabsList>
          <TabsTrigger value="single">Single Payment Invoice</TabsTrigger>
          <TabsTrigger value="multi">Multiple Payment Invoice</TabsTrigger>
        </TabsList>

        {/* SINGLE */}
        <TabsContent value="single" className="mt-2">
          <Card>
            <CardContent className="grid gap-5 grid-cols-1 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <Input id="invoice_number" name="invoice_number" placeholder="INV-2025-001" required />
              </div>
              {/* Total row under the grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-2">
                <div className="lg:col-span-9 flex items-center justify-end pr-2">
                  <span className="text-sm text-muted-foreground">Total:</span>
                </div>
                <div className="lg:col-span-2">
                  <Input readOnly value={payments.reduce((sum, p) => sum + (parseFloat(String(p.amount).replace(/,/g, '.')) || 0), 0).toFixed(2)} />
                </div>
                <div className="lg:col-span-1" />
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
              <div className="grid gap-2 md:col-span-2">
                <Label>Event</Label>
                <Select
                  value={eventId}
                  onChange={setEventId}
                  options={events.map((e) => ({ value: e.id, label: e.title }) as SelectOption)}
                  placeholder="Select an event (optional)"
                />
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
                        <Input type="number" min={0} step={1} value={row.quantity} onChange={(e) => updateRow(row.id, { quantity: Number(e.target.value) })} required />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="sr-only">Unit Price</Label>
                        <Input type="number" min={0} step="0.01" value={row.unit_price} onChange={(e) => updateRow(row.id, { unit_price: Number(e.target.value) })} required />
                      </div>
                      <div className="md:col-span-1">
                        <Button type="button" variant="destructive" onClick={() => removeRow(row.id)} aria-label="Remove line item">×</Button>
                      </div>
                    </div>
                  ))}
                  <div>
                    <Button type="button" variant="secondary" onClick={addRow}>Add line item</Button>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* MULTI */}
        <TabsContent value="multi" className="mt-2">
          <Card>
            <CardContent className="grid gap-5">
              <div className="mb-2 text-sm font-medium">Payments</div>
              <div className="grid gap-3">
                {payments.map((p) => (
                  <div key={p.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end">
                    <div className="lg:col-span-3">
                      <Label className="sr-only">Reference</Label>
                      <Input placeholder="Deposit 1" onChange={(e) => updatePayment(p.id, { reference: e.target.value })} value={p.reference || ""} />
                    </div>
                    <div className="lg:col-span-3">
                      <Label className="sr-only">Invoice #</Label>
                      <Input placeholder="INV-2025-001-DEP1" onChange={(e) => updatePayment(p.id, { invoice_number: e.target.value })} value={p.invoice_number || ""} />
                    </div>
                    <div className="lg:col-span-2">
                      <Label className="sr-only">Due date</Label>
                      <PaymentDatePicker value={p.due_date} onChange={(iso) => updatePayment(p.id, { due_date: iso })} />
                    </div>
                    <div className="lg:col-span-1">
                      <Label className="sr-only">Currency</Label>
                      <Select value={p.currency || "GBP"} onChange={(val) => updatePayment(p.id, { currency: val })} options={[{ value: "GBP", label: "GBP" }, { value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }]} />
                    </div>
                    <div className="lg:col-span-2">
                      <Label className="sr-only">Amount</Label>
                      <Input type="text" inputMode="decimal" value={p.amount || ""} onChange={(e) => updatePayment(p.id, { amount: e.target.value })} />
                    </div>
                    <div className="lg:col-span-1">
                      <Button type="button" variant="destructive" onClick={() => removePayment(p.id)} aria-label="Remove payment">×</Button>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-2">
                  <div className="lg:col-span-8">
                    <Button type="button" variant="secondary" onClick={addPayment}>Add payment row</Button>
                  </div>
                  <div className="lg:col-span-1 flex items-center justify-end pr-2">
                    <span className="text-sm text-muted-foreground">Total:</span>
                  </div>
                  <div className="lg:col-span-2">
                    <Input readOnly value={payments.reduce((sum, p) => sum + (parseFloat(String(p.amount).replace(/,/g, '.')) || 0), 0).toFixed(2)} />
                  </div>
                  <div className="lg:col-span-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

          <div className="grid gap-2 md:col-span-2">
            <Label>Event</Label>
            <Select
              value={eventId}
              onChange={setEventId}
              options={events.map((e) => ({ value: e.id, label: e.title }) as SelectOption)}
              placeholder="Select an event (optional)"
            />
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

          <div className="col-span-full">
            <div className="mb-2 text-sm font-medium">Payments</div>
            <div className="grid gap-3">
              {payments.map((p) => (
                <div key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-4">
                    <Label className="sr-only">Name</Label>
                    <Input placeholder="Deposit 1" value={p.name} onChange={(e) => updatePayment(p.id, { name: e.target.value })} />
                  </div>
                  <div className="md:col-span-4">
                    <Label className="sr-only">Due date</Label>
                    <Input type="date" value={p.due_date} onChange={(e) => updatePayment(p.id, { due_date: e.target.value })} />
                  </div>
                    <div className="md:col-span-3">
                    <Label className="sr-only">Amount</Label>
                      <Input type="text" inputMode="decimal" value={p.amount || ""} onChange={(e) => updatePayment(p.id, { amount: e.target.value })} />
                  </div>
                  <div className="md:col-span-1">
                    <Button type="button" variant="destructive" onClick={() => removePayment(p.id)} aria-label="Remove payment">×</Button>
                  </div>
                </div>
              ))}
              <div>
                <Button type="button" variant="secondary" onClick={addPayment}>Add payment</Button>
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

function PaymentDatePicker({ value, onChange }: { value?: string; onChange: (iso: string) => void }) {
  const [open, setOpen] = React.useState(false)
  const parsed = value ? new Date(value) : undefined
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between font-normal w-full">
          {parsed ? parsed.toLocaleDateString() : "Select date"}
          <ChevronDownIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0 bg-popover border rounded-md shadow-md" align="start">
        <Calendar
          mode="single"
          selected={parsed}
          onSelect={(d) => { if (d) onChange(d.toISOString().slice(0, 10)); setOpen(false) }}
        />
      </PopoverContent>
    </Popover>
  )
}

