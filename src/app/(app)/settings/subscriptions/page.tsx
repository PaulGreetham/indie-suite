"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useAuth } from "@/lib/firebase/auth-context"

type SubState = { plan: string | null; status: string | null; customerId: string | null; subscriptionId: string | null }

export default function SettingsSubscriptionsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = React.useState(false)
  const [state, setState] = React.useState<SubState>({ plan: null, status: null, customerId: null, subscriptionId: null })
  const [pendingPlan, setPendingPlan] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  React.useEffect(() => {
    async function load() {
      if (!user?.email) return
      const res = await fetch("/api/stripe/get-subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email }) })
      const data = await res.json()
      setState({ plan: data.plan, status: data.status, customerId: data.customerId, subscriptionId: data.subscriptionId })
    }
    load().catch(() => void 0)
  }, [user?.email])

  function requestPlan(plan: string) {
    setPendingPlan(plan)
    setConfirmOpen(true)
  }

  async function confirmPlanChange() {
    if (!user?.email || !pendingPlan) return
    setLoading(true)
    const res = await fetch("/api/stripe/create-checkout-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: pendingPlan, email: user.email }) })
    const data = await res.json()
    setLoading(false)
    setConfirmOpen(false)
    setPendingPlan(null)
    if (data?.url) window.location.href = data.url
  }

  const [cancelOpen, setCancelOpen] = React.useState(false)

  async function openPortal() {
    if (!user?.email) return
    setLoading(true)
    const res = await fetch("/api/stripe/create-portal-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email }) })
    const data = await res.json()
    setLoading(false)
    if (data?.url) window.location.href = data.url
  }

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">Subscriptions</h1>
      <div className="grid gap-4">
        <Card>
          <CardContent className="grid gap-4 py-6">
            <div className="text-sm text-muted-foreground">Current: {state.plan ? state.plan.toUpperCase() : "None"} {state.status ? `· ${state.status}` : ""}</div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => requestPlan("pro")} disabled={loading || state.plan === "pro"}>Choose Pro</Button>
              <Button onClick={() => requestPlan("pro+")} disabled={loading || state.plan === "pro+"}>Choose Pro +</Button>
              <Button onClick={() => requestPlan("pro++")} disabled={loading || state.plan === "pro++"}>Choose Pro ++</Button>
            </div>
            <div>
              <Button variant="secondary" onClick={() => setCancelOpen(true)} disabled={loading}>Cancel subscription</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => { setConfirmOpen(o); if (!o) setPendingPlan(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPlan ? `You are about to switch to ${pendingPlan.toUpperCase()}. You will be redirected to Stripe to confirm and handle payment.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={confirmPlanChange} disabled={loading}>Continue</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to Stripe’s portal to cancel or resume your subscription. Your current access will remain until the end of the billing period unless changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Keep subscription</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={openPortal}>Continue to Stripe</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


