"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function SettingsBillingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  function manageBilling() {
    setLoading("portal")
    fetch("/api/stripe/create-portal-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: "{{REPLACE_WITH_CUSTOMER_ID}}" }),
    })
      .then((res) => res.json())
      .then(({ url }) => { if (url) window.location.href = url as string })
      .finally(() => setLoading(null))
  }

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">Billing</h1>
      <div className="grid gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            <div className="text-sm text-muted-foreground">Open the customer portal to manage invoices, payment methods and subscription.</div>
            <div className="ml-auto">
              <Button onClick={manageBilling} disabled={loading !== null}>{loading ? "Opening…" : "Manage in Stripe"}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


