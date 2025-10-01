import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const plans = [
  { name: "Starter", price: "$0", period: "/mo", features: ["1 project", "Community support", "Basic analytics"], cta: { href: "/signup", label: "Get started" } },
  { name: "Pro", price: "$19", period: "/mo", features: ["5 projects", "Email support", "Advanced analytics"], cta: { href: "/signup", label: "Start Pro" } },
  { name: "Team", price: "$49", period: "/mo", features: ["Unlimited projects", "Team roles", "Priority support"], cta: { href: "/signup", label: "Start Team" } },
  { name: "Enterprise", price: "Custom", period: "", features: ["SLA & SSO", "Dedicated support", "Custom limits"], cta: { href: "/login", label: "Contact sales" } },
]

export default function PricingPage() {
  return (
    <main className="container mx-auto max-w-6xl px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-semibold tracking-tight">Choose a plan</h1>
        <p className="text-muted-foreground mt-3">Simple, transparent pricing that scales with you.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.name} className="p-6 flex flex-col">
            <h3 className="text-xl font-semibold">{plan.name}</h3>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-3xl font-bold">{plan.price}</span>
              {plan.period ? <span className="text-muted-foreground">{plan.period}</span> : null}
            </div>
            <ul className="mt-6 space-y-2 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="text-muted-foreground">• {f}</li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <Button className="w-full" asChild>
                <Link href={plan.cta.href}>{plan.cta.label}</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </main>
  )
}


