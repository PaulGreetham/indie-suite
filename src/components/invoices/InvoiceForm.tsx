"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createInvoice, type InvoiceInput, type InvoicePayment } from "@/lib/firebase/invoices"
import { Select as UiSelect } from "@/components/ui/select"
import { getFirestoreDb } from "@/lib/firebase/client"
import { listTradingDetails } from "@/lib/firebase/user-settings"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { Select, type SelectOption } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronDownIcon } from "lucide-react"

type InvoiceDoc = Partial<InvoiceInput> & { payments?: Partial<InvoicePayment>[] }

type Props = {
  onCreated?: (id: string) => void
  initial?: InvoiceDoc
  readOnly?: boolean
  submitLabel?: string
  onSubmitExternal?: (payload: InvoiceInput) => Promise<void>
}

type LineItem = { id: string; description: string; quantity: number; unit_price: number }
type Payment = { id: string; name?: string; reference?: string; invoice_number?: string; issue_date?: string; currency?: string; due_date: string; amount: string }

export default function InvoiceForm({ onCreated, initial, readOnly = false, submitLabel = "Save Invoice", onSubmitExternal }: Props) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [lineItems] = React.useState<LineItem[]>([])
  const [payments, setPayments] = React.useState<Payment[]>([
    { id: crypto.randomUUID(), name: "Final payment", reference: "", invoice_number: "", currency: "GBP", due_date: "", amount: "" },
  ])
  const [saving, setSaving] = React.useState(false)
  const [tradingOptions, setTradingOptions] = React.useState<SelectOption[]>([])
  const [tradingById, setTradingById] = React.useState<Record<string, { name?: string; emails?: string[]; contactName?: string; contactEmail?: string; phone?: string }>>({})
  const [customers, setCustomers] = React.useState<SelectOption[]>([])
  const [customerById, setCustomerById] = React.useState<Record<string, { name: string; email: string; phone?: string }>>({})
  const [venueOptions, setVenueOptions] = React.useState<SelectOption[]>([])
  const [venueById, setVenueById] = React.useState<Record<string, { name?: string; city?: string; postcode?: string; phone?: string }>>({})

  const [userBusinessName, setUserBusinessName] = React.useState<string>("")
  const [userEmail, setUserEmail] = React.useState<string>("")
  const [userContactName, setUserContactName] = React.useState<string>("")
  const [userPhone, setUserPhone] = React.useState<string>("")
  const [customerName, setCustomerName] = React.useState<string>("")
  const [customerEmail, setCustomerEmail] = React.useState<string>("")
  const [customerPhone, setCustomerPhone] = React.useState<string>("")
  const [venueName, setVenueName] = React.useState<string>("")
  const [venueCity, setVenueCity] = React.useState<string>("")
  const [venuePostcode, setVenuePostcode] = React.useState<string>("")
  const [venuePhone, setVenuePhone] = React.useState<string>("")
  const [status, setStatus] = React.useState<InvoiceInput["status"]>(initial?.status || "draft")

  const loadData = React.useCallback(async () => {
      const db = getFirestoreDb()
      const [custSnap, tradingDetails, venSnap] = await Promise.all([
        getDocs(query(collection(db, "customers"), orderBy("fullNameLower", "asc"))),
        listTradingDetails().catch(() => []),
        getDocs(query(collection(db, "venues"), orderBy("nameLower", "asc"))).catch(() => ({ docs: [] } as unknown as { docs: Array<{ id: string; data: () => unknown }> })),
      ])

      // Customers
      const custMap: Record<string, { name: string; email: string; phone?: string }> = {}
      const custOptions: SelectOption[] = custSnap.docs.map((d) => {
        const v = d.data() as { fullName?: string; company?: string; email?: string; phone?: string }
        const name = String(v.fullName || v.company || "")
        custMap[d.id] = { name, email: String(v.email || ""), phone: v.phone ? String(v.phone) : undefined }
        return { value: d.id, label: name }
      })
      setCustomers(custOptions)
      setCustomerById(custMap)

      // Business details
      const tradingMap: Record<string, { name?: string; emails?: string[]; contactName?: string; contactEmail?: string; phone?: string }> = {}
      const tradingOptions: SelectOption[] = tradingDetails.map((t) => {
        tradingMap[t.id] = { name: t.name, emails: t.emails, contactName: t.contactName, contactEmail: t.contactEmail, phone: t.phone }
        return { value: t.id, label: t.name }
      })
      setTradingById(tradingMap)
      setTradingOptions(tradingOptions)

      // Venues
      const vMap: Record<string, { name?: string; city?: string; postcode?: string; phone?: string }> = {}
      const vOptions: SelectOption[] = (venSnap.docs || []).map((d: { id: string; data: () => unknown }) => {
        const v = d.data() as { name?: string; address?: { city?: string; postcode?: string } | undefined; phone?: string }
        vMap[d.id] = { name: v.name, city: v.address?.city, postcode: v.address?.postcode, phone: v.phone }
        return { value: d.id, label: String(v.name || "") }
      })
      setVenueById(vMap)
      setVenueOptions(vOptions)
  }, [])

  React.useEffect(() => {
    loadData().catch(() => { setCustomers([]); setTradingOptions([]); setVenueOptions([]) })
  }, [loadData])

  // Seed from initial for edit-readOnly display
  React.useEffect(() => {
    if (!initial) return
    if (Array.isArray(initial.payments) && initial.payments.length) {
      setPayments(
        initial.payments.map((p) => ({
          id: crypto.randomUUID(),
          name: p.name,
          reference: p.reference,
          invoice_number: p.invoice_number || initial.invoice_number,
          currency: p.currency || "GBP",
          issue_date: p.issue_date || initial.issue_date,
          due_date: p.due_date || initial.due_date || "",
          amount: String(p.amount ?? ""),
        }))
      )
    }
    setUserBusinessName(initial.user_business_name || "")
    setUserEmail(initial.user_email || "")
    setCustomerName(initial.customer_name || "")
    setCustomerEmail(initial.customer_email || "")
    setVenueName(initial.venue_name || "")
    setVenueCity(initial.venue_city || "")
    setVenuePostcode(initial.venue_postcode || "")
    setVenuePhone(initial.venue_phone || "")
  }, [initial])

  React.useEffect(() => {
    const onFocus = () => { loadData().catch(() => void 0) }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus)
      document.addEventListener('visibilitychange', onFocus)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus)
        document.removeEventListener('visibilitychange', onFocus)
      }
    }
  }, [loadData])

  // Line items editing has been removed in favor of payments.

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
      const primaryPayment = payments.find((p) => p.invoice_number || p.issue_date || p.due_date || p.amount) || payments[0]
      const topInvoiceNumber = String(primaryPayment?.invoice_number || "").trim()
      const topIssueDate = String(primaryPayment?.issue_date || "")
      const topDueDate = String(primaryPayment?.due_date || "")
      const payload: InvoiceInput = {
        invoice_number: topInvoiceNumber,
        issue_date: topIssueDate,
        due_date: topDueDate,
        user_business_name: String(formData.get("user_business_name") || userBusinessName || "").trim(),
        user_email: String(formData.get("user_email") || userEmail || "").trim(),
        customer_name: String(formData.get("customer_name") || customerName || "").trim(),
        customer_email: String(formData.get("customer_email") || customerEmail || "").trim(),
        line_items: lineItems.map(({ description, quantity, unit_price }) => ({ description, quantity, unit_price })),
        payments: payments
          .filter((p) => p.name || p.due_date || p.amount)
          .map(({ name, due_date, amount, reference, invoice_number, currency }) => ({ name: name || "", due_date: due_date || "", amount: toNumber(amount), reference, invoice_number, currency })),
        notes: String(formData.get("notes") || "").trim() || undefined,
        payment_link: String(formData.get("payment_link") || "").trim() || undefined,
        venue_name: String(formData.get("venue_name") || venueName || ""),
        venue_city: String(formData.get("venue_city") || venueCity || ""),
        venue_postcode: String(formData.get("venue_postcode") || venuePostcode || ""),
        venue_phone: String(formData.get("venue_phone") || venuePhone || ""),
        status,
      }
      if (onSubmitExternal) {
        await onSubmitExternal(payload)
        try { const { toast } = await import("sonner"); toast.success("Invoice updated") } catch {}
        return
      }
      let id: string | null = null
      try {
        id = await createInvoice(payload)
      } catch (e: unknown) {
        const errObj = e as { code?: string; message?: string }
        const code = errObj?.code || errObj?.message
        if (code === "INVOICE_NUMBER_NOT_UNIQUE") {
          try { const { toast } = await import("sonner"); toast.error("Invoice number already exists. Please use a unique number.") } catch {}
          return
        }
        throw e as Error
      }
      // Alert toast (using sonner)
      try { const { toast } = await import("sonner"); toast.success("Invoice created"); } catch {}
      onCreated?.(id!)
      formRef.current?.reset()
      setPayments([{ id: crypto.randomUUID(), name: "Final payment", reference: "", invoice_number: "", currency: "GBP", due_date: "", amount: "" }])
    } finally {
      setSaving(false)
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid gap-6">
      {/* Payments */}
      <Card>
        <CardContent className="grid gap-2">
          <div className="mb-2 text-sm font-medium">Payments</div>
          <div className="grid gap-3">
            <div className="hidden lg:grid lg:grid-cols-24 gap-3 text-xs text-muted-foreground px-1">
              <div className="lg:col-span-5">Description</div>
              <div className="lg:col-span-5">Invoice Number</div>
              <div className="lg:col-span-3">Issue Date</div>
              <div className="lg:col-span-3">Due Date</div>
              <div className="lg:col-span-2">Currency</div>
              <div className="lg:col-span-5">Amount</div>
              <div className="lg:col-span-1">Delete</div>
            </div>
            {payments.map((p) => (
              <div key={p.id} className="grid grid-cols-1 lg:grid-cols-24 gap-2 items-end">
                <div className="lg:col-span-5">
                  <Label className="sr-only">Reference</Label>
                  <Input placeholder="Deposit 1" onChange={(e) => updatePayment(p.id, { reference: e.target.value })} value={p.reference || ""} disabled={readOnly} />
                </div>
                <div className="lg:col-span-5">
                  <Label className="sr-only">Invoice #</Label>
                  <Input placeholder="INV-2025-001-DEP1" onChange={(e) => updatePayment(p.id, { invoice_number: e.target.value })} value={p.invoice_number || ""} disabled={readOnly} />
                </div>
                <div className="lg:col-span-3">
                  <Label className="sr-only">Issue date</Label>
                  <PaymentDatePicker value={p.issue_date} onChange={(iso) => !readOnly && updatePayment(p.id, { issue_date: iso })} placeholder="Select" />
                </div>
                <div className="lg:col-span-3">
                  <Label className="sr-only">Due date</Label>
                  <PaymentDatePicker value={p.due_date} onChange={(iso) => !readOnly && updatePayment(p.id, { due_date: iso })} placeholder="Select" />
                </div>
                <div className="lg:col-span-2">
                  <Label className="sr-only">Currency</Label>
                  <Select value={p.currency || "GBP"} onChange={(val) => updatePayment(p.id, { currency: val })} options={[{ value: "GBP", label: "GBP" }, { value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }]} disabled={readOnly} />
                </div>
                <div className="lg:col-span-5">
                  <Label className="sr-only">Amount</Label>
                  <Input type="text" inputMode="decimal" value={p.amount || ""} onChange={(e) => updatePayment(p.id, { amount: e.target.value })} disabled={readOnly} />
                </div>
                <div className="lg:col-span-1">
                  {!readOnly && (
                    <Button type="button" variant="destructive" onClick={() => removePayment(p.id)} aria-label="Remove payment">×</Button>
                  )}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-1 lg:grid-cols-24 items-center gap-2">
              <div className="lg:col-span-17">
                {!readOnly ? (
                  <Button type="button" variant="secondary" onClick={addPayment}>Add payment row</Button>
                ) : (
                  <div />
                )}
              </div>
              <div className="lg:col-span-1 flex items-center justify-end pr-2">
                <span className="text-sm text-muted-foreground">Total:</span>
              </div>
              <div className="lg:col-span-5">
                <Input readOnly value={payments.reduce((sum, p) => sum + (parseFloat(String(p.amount).replace(/,/g, '.')) || 0), 0).toFixed(2)} />
              </div>
              <div className="lg:col-span-1" />
            </div>
          </div>
        </CardContent>
      </Card>
      {/* One card: selectors + read-only columns under each */}
      <Card>
        <CardContent className="grid gap-5 grid-cols-1 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>Business</Label>
            <Select
              options={tradingOptions}
              onChange={(id) => { const t = tradingById[id]; setUserBusinessName(t?.name || ""); setUserEmail(t?.contactEmail || (t?.emails?.[0] || "")); setUserContactName(t?.contactName || ""); setUserPhone(t?.phone || "") }}
              placeholder="Select business"
              prefixItems={[{ label: "Manage Trading Details", href: "/settings/trading-details" }]}
              disabled={readOnly}
            />
            <Input readOnly value={userBusinessName} placeholder="Trading/Business name" />
            <Input readOnly value={userEmail} placeholder="Email" />
            <Input readOnly value={userContactName} placeholder="Contact" />
            <Input readOnly value={userPhone} placeholder="Phone" />
          </div>
          <div className="grid gap-2">
            <Label>Customer</Label>
            <Select
              options={customers}
              onChange={(id) => { const c = customerById[id]; setCustomerName(c?.name || ""); setCustomerEmail(c?.email || ""); setCustomerPhone(c?.phone || "") }}
              placeholder="Select customer"
              prefixItems={[{ label: "Create Customer", href: "/customers/create" }]}
              disabled={readOnly}
            />
            <Input readOnly value={customerName} placeholder="Business name" />
            <Input readOnly value={customerName} placeholder="Contact" />
            <Input readOnly value={customerEmail} placeholder="Email" />
            <Input readOnly value={customerPhone} placeholder="Phone" />
          </div>
          <div className="grid gap-2">
            <Label>Venue</Label>
            <Select
              options={venueOptions}
              onChange={(id) => { const v = venueById[id]; setVenueName(v?.name || ""); setVenueCity(v?.city || ""); setVenuePostcode(v?.postcode || ""); setVenuePhone(v?.phone || "") }}
              placeholder="Select venue"
              prefixItems={[{ label: "Create Venue", href: "/venues/create" }]}
              disabled={readOnly}
            />
            <Input readOnly value={venueName} placeholder="Venue name" />
            <Input readOnly value={venueCity} placeholder="City" />
            <Input readOnly value={venuePostcode} placeholder="Post/Zip" />
            <Input readOnly value={venuePhone} placeholder="Phone" />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <UiSelect
              value={status || "draft"}
              onChange={(val) => setStatus((val as InvoiceInput["status"]) || "draft")}
              options={[
                { value: "draft", label: "Draft" },
                { value: "sent", label: "Sent/Open" },
                { value: "paid", label: "Paid" },
                { value: "partial", label: "Partially Paid" },
                { value: "overdue", label: "Overdue" },
                { value: "void", label: "Void" },
              ]}
              disabled={readOnly}
            />
          </div>
          {/* Hidden inputs so current payload receives values */}
          <input type="hidden" name="user_business_name" value={userBusinessName} />
          <input type="hidden" name="user_email" value={userEmail} />
          <input type="hidden" name="customer_name" value={customerName} />
          <input type="hidden" name="customer_email" value={customerEmail} />
          <input type="hidden" name="venue_name" value={venueName} />
          <input type="hidden" name="venue_city" value={venueCity} />
          <input type="hidden" name="venue_postcode" value={venuePostcode} />
          <input type="hidden" name="venue_phone" value={venuePhone} />
        </CardContent>
      </Card>

      {/* Payment link & Notes */}
      <Card>
        <CardContent className="grid gap-5 grid-cols-1 md:grid-cols-3">
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="payment_link">Payment Link</Label>
            <Input id="payment_link" name="payment_link" placeholder="https://pay.stripe.com/..." disabled={readOnly} />
          </div>
          <div className="grid gap-2 md:col-span-3">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" placeholder="Thanks for your business." rows={4} disabled={readOnly} />
          </div>
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : submitLabel}</Button>
        </div>
      )}
    </form>
  )
}

function PaymentDatePicker({ value, onChange, placeholder = "Select date" }: { value?: string; onChange: (iso: string) => void; placeholder?: string }) {
  const [open, setOpen] = React.useState(false)
  const parsed = value ? new Date(value) : undefined
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between font-normal w-full">
          {parsed ? parsed.toLocaleDateString() : placeholder}
          <ChevronDownIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0 bg-popover border rounded-md shadow-md" align="start">
        <Calendar
          mode="single"
          selected={parsed}
          onSelect={(d) => {
            if (d) {
              // Use local date (avoid timezone shifting) -> YYYY-MM-DD
              const yyyy = d.getFullYear()
              const mm = String(d.getMonth() + 1).padStart(2, '0')
              const dd = String(d.getDate()).padStart(2, '0')
              onChange(`${yyyy}-${mm}-${dd}`)
            }
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}


