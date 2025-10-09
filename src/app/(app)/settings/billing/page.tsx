"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function SettingsBillingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  async function manageBilling() {
    try {
      setLoading("portal")
      // In a real app you'd fetch the Stripe customer id from the user profile
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: "{{REPLACE_WITH_CUSTOMER_ID}}" }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url as string
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <p className="text-sm text-muted-foreground">Manage your subscription and payment details.</p>
      <div className="flex gap-3">
        <Button onClick={manageBilling} disabled={loading !== null}>Manage subscription</Button>
      </div>
    </div>
  )
}


