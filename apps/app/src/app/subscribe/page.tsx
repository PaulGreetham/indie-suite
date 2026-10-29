"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { signOutUser } from "@/lib/firebase/auth"
import {
  fetchSubscription,
  openBillingPortal,
  startCheckout,
  startTrial,
  type SubscriptionInfo,
} from "@/lib/stripe/billing-client"

const PLANS = [
  { key: "pro", name: "Pro", accounts: "1 account" },
  { key: "pro-plus", name: "Portfolio", accounts: "Up to 3 accounts" },
  { key: "pro-plus-plus", name: "Agency", accounts: "Up to 10 accounts" },
]

export default function SubscribePage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="min-h-svh grid place-items-center p-6">Loading…</div>}>
        <SubscribeContent />
      </Suspense>
    </AuthGuard>
  )
}

function SubscribeContent() {
  const router = useRouter()
  const search = useSearchParams()
  const checkoutSucceeded = search.get("checkout") === "success"
  const [info, setInfo] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState("pro")
  const [yearly, setYearly] = useState(false)

  const load = useCallback(async () => {
    // After checkout the webhook can lag behind Stripe's redirect, so poll briefly
    const attempts = checkoutSucceeded ? 10 : 1
    for (let i = 0; i < attempts; i++) {
      const next = await fetchSubscription().catch(() => null)
      if (next?.active) {
        router.replace("/dashboard/overview")
        return
      }
      setInfo(next)
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 2000))
    }
    setLoading(false)
  }, [checkoutSucceeded, router])

  useEffect(() => { load() }, [load])

  async function continueWithPlan() {
    setBusy(true)
    setError(null)
    const choice = { plan, interval: yearly ? "yearly" as const : "monthly" as const }
    try {
      if (info?.trialAvailable) {
        const result = await startTrial(choice)
        if (result.ok) {
          router.replace("/dashboard/overview")
          return
        }
        if (result.error !== "trial_used") throw new Error("Unable to start your free trial")
      }
      if (!(await startCheckout(choice))) throw new Error("Unable to start checkout")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-svh grid place-items-center p-6 text-sm text-muted-foreground">
        {checkoutSucceeded ? "Confirming your subscription…" : "Loading…"}
      </div>
    )
  }

  return (
    <div className="min-h-svh grid place-items-center p-6">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Choose your plan</h1>
          <p className="text-sm text-muted-foreground">
            {info?.trialAvailable
              ? "Every plan includes everything. Start with 3 months free, no card needed."
              : checkoutSucceeded
                ? "We're still confirming your payment. Refresh in a moment, or contact support if this persists."
                : "Your account needs an active subscription to continue."}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 text-sm">
          <span>Monthly</span>
          <Switch checked={yearly} onCheckedChange={setYearly} aria-label="Bill yearly" />
          <span>Yearly</span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <Card
              key={p.key}
              role="button"
              tabIndex={0}
              onClick={() => setPlan(p.key)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setPlan(p.key) }}
              className={cn("cursor-pointer transition-colors", plan === p.key && "border-primary ring-2 ring-primary")}
            >
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>{p.accounts}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">All features included</CardContent>
            </Card>
          ))}
        </div>

        {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col items-center gap-3">
          <Button className="w-full max-w-sm" onClick={continueWithPlan} disabled={busy}>
            {busy ? "Please wait…" : info?.trialAvailable ? "Start my 3-month free trial" : "Subscribe"}
          </Button>
          {info?.customerId ? (
            <Button variant="outline" className="w-full max-w-sm" disabled={busy} onClick={() => { openBillingPortal().catch(() => false) }}>
              Manage billing
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => signOutUser().then(() => router.replace("/login"))}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}
