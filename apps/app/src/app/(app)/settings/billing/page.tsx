"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { openBillingPortal } from "@/lib/stripe/billing-client"

export default function SettingsBillingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  function manageBilling() {
    setLoading("portal")
    openBillingPortal()
      .catch(() => false)
      .finally(() => setLoading(null))
  }

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">Billing</h1>
      <div className="grid gap-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Customer portal</CardTitle>
            <CardAction>
              <Button onClick={manageBilling} disabled={loading !== null}>{loading ? "Opening…" : "Manage in Stripe"}</Button>
            </CardAction>
          </CardHeader>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              Open the Stripe customer portal to update payment methods, view and download invoices, and manage your subscription.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


