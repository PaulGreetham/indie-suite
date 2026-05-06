"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useAuth } from "@/lib/firebase/auth-context"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

type SubState = { plan: string | null; status: string | null; customerId: string | null; subscriptionId: string | null }
type BillingCycle = "monthly" | "yearly"

type PlanMeta = {
  id: "pro" | "pro+" | "pro++"
  name: string
  monthlyPrice: number
  yearlyPrice: number
  description: string
  isPopular?: boolean
  features: string[]
}

const plans: PlanMeta[] = [
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 20,
    yearlyPrice: 16,
    description: "Perfect for single/solo performers",
    features: [
      "1 Account",
      "Advanced Metrics & Analytics",
      "Unlimited CRM & Venue Management",
      "Unlimited Event & Invoice Creation",
      "Unlimited Contract Creation & Signatures",
      "Email Support",
    ],
  },
  {
    id: "pro+",
    name: "Portfolio",
    monthlyPrice: 50,
    yearlyPrice: 40,
    description: "Ideal for multiple accounts",
    isPopular: true,
    features: [
      "Up to 3 Accounts",
      "Advanced Metrics & Analytics",
      "Unlimited CRM & Venue Management",
      "Unlimited Event & Invoice Creation",
      "Unlimited Contract Creation & Signatures",
      "Email Support",
    ],
  },
  {
    id: "pro++",
    name: "Agency",
    monthlyPrice: 100,
    yearlyPrice: 80,
    description: "For agencies & multiple businesses",
    features: [
      "Up to 10 Accounts",
      "Advanced Metrics & Analytics",
      "Unlimited CRM & Venue Management",
      "Unlimited Event & Invoice Creation",
      "Unlimited Contract Creation & Signatures",
      "Email Support",
    ],
  },
]

export default function SettingsSubscriptionsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = React.useState(false)
  const [billingCycle, setBillingCycle] = React.useState<BillingCycle>("monthly")
  const [state, setState] = React.useState<SubState>({ plan: null, status: null, customerId: null, subscriptionId: null })
  const [pendingPlan, setPendingPlan] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const planLabel = React.useMemo(() => {
    if (state.plan === "pro+") return "Portfolio"
    if (state.plan === "pro++") return "Agency"
    if (state.plan === "pro") return "Pro"
    return "None"
  }, [state.plan])
  const pendingPlanLabel = React.useMemo(() => {
    if (pendingPlan === "pro+") return "Portfolio"
    if (pendingPlan === "pro++") return "Agency"
    if (pendingPlan === "pro") return "Pro"
    return ""
  }, [pendingPlan])

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
    // For now we still open portal (single place) but keep upgrade flow for future marketing
    // If you later want direct checkout for new users, you can call the checkout endpoint here
    setConfirmOpen(false)
    setPendingPlan(null)
    await openPortal()
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
          <CardContent className="grid gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>Current:</span>
                  <Badge className="bg-[#fcf400] text-black hover:bg-[#fcf400]">{planLabel}</Badge>
                  {state.status ? <span>· {state.status}</span> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Compare everything included in each plan, then continue in Stripe to confirm your subscription.
                </p>
              </div>
              <div className="inline-flex rounded-lg border p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={billingCycle === "monthly" ? "default" : "ghost"}
                  onClick={() => setBillingCycle("monthly")}
                  disabled={loading}
                >
                  Monthly
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={billingCycle === "yearly" ? "default" : "ghost"}
                  onClick={() => setBillingCycle("yearly")}
                  disabled={loading}
                >
                  Yearly
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {plans.map((plan) => {
                const isCurrent = state.plan === plan.id
                const fullPrice = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "rounded-xl border bg-card p-4 text-card-foreground",
                      isCurrent && "ring-1 ring-[#fcf400]"
                    )}
                  >
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <Badge className="bg-[#fcf400] text-black hover:bg-[#fcf400]">{plan.name}</Badge>
                      {plan.isPopular ? (
                        <Badge variant="outline" className="border-[#fcf400] text-[#fcf400]">
                          Most Popular
                        </Badge>
                      ) : null}
                      {isCurrent ? (
                        <Badge className="bg-[#fcf400] text-black hover:bg-[#fcf400]">Current Plan</Badge>
                      ) : null}
                    </div>

                    <div className="mb-2 flex items-end gap-1">
                      <span className="text-3xl font-bold tracking-tight">€{fullPrice}</span>
                      <span className="text-xs text-muted-foreground">/ month</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {billingCycle === "monthly" ? "Billed monthly" : "Billed yearly"}
                    </p>

                    <ul className="mt-4 space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#fcf400]" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <p className="mt-4 text-xs text-muted-foreground">{plan.description}</p>

                    <Button
                      className="mt-4 w-full"
                      onClick={() => {
                        if (isCurrent) return
                        requestPlan(plan.id)
                      }}
                      disabled={loading}
                      variant={isCurrent ? "default" : "secondary"}
                    >
                      {isCurrent ? "Current Plan" : `Choose ${plan.name}`}
                    </Button>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setCancelOpen(true)} disabled={loading}>Cancel in Stripe</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => { setConfirmOpen(o); if (!o) setPendingPlan(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPlan ? `You are about to start or switch to ${pendingPlanLabel}. We will open Stripe’s portal so you can confirm.` : ""}
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
            <AlertDialogTitle>Open Stripe to manage/cancel?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to Stripe’s portal to cancel or resume your subscription. Your current access will remain until the end of the billing period unless changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Close</Button>
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


