"use client"

import { useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { BankAccountInput } from "@/lib/firebase/user-settings"

export type BankAccountFormValues = BankAccountInput

export function BankAccountForm({
  initial,
  submitLabel = "Save",
  onSubmit,
  onCancel,
  submitting = false,
  readOnly = false,
  hideActions = false,
}: {
  initial?: Partial<BankAccountFormValues>
  submitLabel?: string
  submitting?: boolean
  onSubmit: (data: BankAccountFormValues) => Promise<void> | void
  onCancel?: () => void
  readOnly?: boolean
  hideActions?: boolean
}) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    const values: BankAccountFormValues = {
      name: String(formData.get("name") || "").trim(),
      bankName: String(formData.get("bankName") || "").trim() || undefined,
      accountHolder: String(formData.get("accountHolder") || "").trim() || undefined,
      accountNumberOrIban: String(formData.get("accountNumberOrIban") || "").trim() || undefined,
      sortCodeOrBic: String(formData.get("sortCodeOrBic") || "").trim() || undefined,
      currency: String(formData.get("currency") || "").trim() || undefined,
      notes: String(formData.get("notes") || "").trim() || undefined,
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
            <p className="text-sm font-medium text-muted-foreground">Bank account details</p>
          </div>
          <div className="grid gap-2 md:col-span-3">
            <Label htmlFor="name">Name for this account</Label>
            <Input id="name" name="name" required defaultValue={initial?.name} placeholder="e.g., Main GBP Account" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bankName">Bank name</Label>
            <Input id="bankName" name="bankName" defaultValue={initial?.bankName} placeholder="Bank name" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="accountHolder">Account holder</Label>
            <Input id="accountHolder" name="accountHolder" defaultValue={initial?.accountHolder} placeholder="Your business name" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="accountNumberOrIban">Account number / IBAN</Label>
            <Input id="accountNumberOrIban" name="accountNumberOrIban" defaultValue={initial?.accountNumberOrIban} placeholder="GB00 BARC 0000 0000 0000 00" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sortCodeOrBic">Sort code / BIC</Label>
            <Input id="sortCodeOrBic" name="sortCodeOrBic" defaultValue={initial?.sortCodeOrBic} placeholder="00-00-00 / BARCGB22" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" name="currency" defaultValue={initial?.currency ?? "GBP"} placeholder="GBP" readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="md:col-span-3">
            <Separator className="my-1" />
          </div>
          <div className="grid gap-2 md:col-span-3">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" defaultValue={initial?.notes} placeholder="e.g., Use this account for domestic transfers." readOnly={readOnly} disabled={readOnly} />
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


