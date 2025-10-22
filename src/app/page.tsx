import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Users, Building2, Receipt, BookOpen, PieChart } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute right-4 top-4 z-10">
          <ModeToggle />
        </div>
        <div className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(60%_60%_at_50%_10%,black,transparent)] bg-[radial-gradient(1000px_400px_at_50%_-20%,hsl(var(--primary)/0.15),transparent)]" />
        <div className="container mx-auto max-w-6xl px-6 py-28 sm:py-36 text-center">
          <h1 className="mt-32 text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl leading-tight max-w-6xl mx-auto">
            <span className="block sm:whitespace-nowrap">Stop doing so much gig admin.</span>
            <span className="block sm:whitespace-nowrap">You don’t have to.</span>
          </h1>
          <p className="mt-5 mx-auto max-w-2xl text-muted-foreground text-lg sm:text-xl">IndieSuite handles your bookings, clients, invoices & contracts — all in one place, built for creatives who live by events.</p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/#pricing">Sign up</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/#pricing">Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={<Calendar className="size-5" />} title="Calendar-first events">
              Plan across months with a 4-month view, day drill-down and per-day event tables.
            </Feature>
            <Feature icon={<Users className="size-5" />} title="Customers CRM">
              Capture contacts and companies, filter fast, and edit inline without page hops.
            </Feature>
            <Feature icon={<Building2 className="size-5" />} title="Venues & details">
              Store address, capacity and notes. Quickly find locations when creating events.
            </Feature>
            <Feature icon={<Receipt className="size-5" />} title="Invoices with stages">
              Single or multi‑payment invoices with due dates, currencies and totals.
            </Feature>
            <Feature icon={<BookOpen className="size-5" />} title="Contracts">
              Track templates and signed agreements so nothing slips through.
            </Feature>
            <Feature icon={<PieChart className="size-5" />} title="Analytics & revenue">
              Understand bookings and revenue at a glance with simple, actionable views.
            </Feature>
          </div>
        </div>
      </section>

      {/* Pricing on landing */}
      <section id="pricing" className="py-14">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold tracking-tight">Simple pricing</h2>
            <p className="text-muted-foreground mt-2">Pick a plan that fits. Upgrade any time.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t">
        <div className="container mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} Indie Suite</div>
          <div className="flex items-center gap-4">
            <Link href="/#pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/login" className="hover:text-foreground">Login</Link>
            <Link href="/#pricing" className="hover:text-foreground">Sign up</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary/10 text-foreground">{icon}</span>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{children}</p>
      </CardContent>
    </Card>
  )
}

const plans = [
  { name: "Pro", price: "€20", period: "/month", features: ["1 Business", "CRM", "Analytics", "Invoice Generation"], cta: { href: "/signup?plan=pro", label: "Get started" } },
  { name: "Pro +", price: "€50", period: "/mo", features: ["Same as Pro, plus:", "Up to 3 Businesses"], cta: { href: "/signup?plan=pro-plus", label: "Start Pro" } },
  { name: "Pro ++", price: "€100", period: "/mo", features: ["Same as Pro +, plus:", "Up to 10 Businesses"], cta: { href: "/signup?plan=pro-plus-plus", label: "Start Team" } },
]
