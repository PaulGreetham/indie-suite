"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Building2, Users, MapPin, Calendar, Receipt, CreditCard, ArrowRight } from "lucide-react"

export default function TutorialPage() {
  const [open, setOpen] = React.useState(false)
  const [guideOpen, setGuideOpen] = React.useState(true)
  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">Tutorial</h1>

      <div className="grid gap-6 max-w-none">
        {/* Hero */}
        <Card>
          <CardHeader>
          <CardTitle className="text-xl">Welcome to IndieSuite</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              IndieSuite helps you run your freelance or agency workflow end‑to‑end — from bookings to invoices — across one or more businesses.
              Here’s the quickest path to your first invoice.
            </p>
            <div className="grid gap-3">
              <QuickStep icon={<Building2 className="h-4 w-4 text-black dark:text-primary" />} title="Add your business">
                <span>Go to <b>Accounts → Trading Details</b> and add your company information.</span>
                <Link className="inline-flex items-center gap-1 underline ml-1" href="/settings/trading-details">Open Trading Details <ArrowRight className="h-3.5 w-3.5" /></Link>
              </QuickStep>
              <QuickStep icon={<CreditCard className="h-4 w-4 text-black dark:text-primary" />} title="Add a bank account">
                <span>Save your bank details so they can appear on invoices.</span>
                <Link className="inline-flex items-center gap-1 underline ml-1" href="/settings/bank-accounts">Open Bank Accounts <ArrowRight className="h-3.5 w-3.5" /></Link>
              </QuickStep>
              <QuickStep icon={<Users className="h-4 w-4 text-black dark:text-primary" />} title="Create a customer">
                <span>Add a client in <b>Customers</b>.</span>
                <Link className="inline-flex items-center gap-1 underline ml-1" href="/customers/create">Create Customer <ArrowRight className="h-3.5 w-3.5" /></Link>
              </QuickStep>
              <QuickStep icon={<MapPin className="h-4 w-4 text-black dark:text-primary" />} title="Add a venue">
                <span>Create a venue or location you’ll work at.</span>
                <Link className="inline-flex items-center gap-1 underline ml-1" href="/venues/create">Create Venue <ArrowRight className="h-3.5 w-3.5" /></Link>
              </QuickStep>
              <QuickStep icon={<Calendar className="h-4 w-4 text-black dark:text-primary" />} title="Book an event">
                <span>Schedule the work and link the customer + venue.</span>
                <Link className="inline-flex items-center gap-1 underline ml-1" href="/events/create">Create Event <ArrowRight className="h-3.5 w-3.5" /></Link>
              </QuickStep>
              <QuickStep icon={<Receipt className="h-4 w-4 text-black dark:text-primary" />} title="Generate the invoice">
                <span>Create and send the invoice right from the event.</span>
                <Link className="inline-flex items-center gap-1 underline ml-1" href="/invoices/create">Create Invoice <ArrowRight className="h-3.5 w-3.5" /></Link>
              </QuickStep>
              <QuickStep icon={<Receipt className="h-4 w-4 text-black dark:text-primary" />} title="Generate a contract">
                <span>Use your saved event/customer details to generate a contract.</span>
                <Link className="inline-flex items-center gap-1 underline ml-1" href="/contracts/create">Create Contract <ArrowRight className="h-3.5 w-3.5" /></Link>
              </QuickStep>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Pro tips</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Bullet>Running multiple businesses? Use the top‑left switcher to change business. Everything you see updates to that business only.</Bullet>
            <Bullet>Prefer dark or light? Toggle the theme from the header at any time.</Bullet>
            <Bullet>Need to adjust your plan? Go to Accounts → Subscriptions or Billing to open the Stripe portal.</Bullet>
            <Bullet>We save you time: event → invoice is designed to be a 30‑second flow.</Bullet>
          </CardContent>
        </Card>
      </div>

      <IntroDialog open={open} onOpenChange={setOpen} onProceed={() => setGuideOpen(true)} />
      <GuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </div>
  )
}

export function IntroDialog({ open, onOpenChange, onProceed }: { open: boolean; onOpenChange: (v: boolean) => void; onProceed?: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Let’s get you set up</AlertDialogTitle>
          <AlertDialogDescription>
            Add your business details, then create customers and venues. Book your first event and generate an invoice — you’ll be set in minutes. You can switch between businesses from the top‑left at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild><Button variant="outline">Close</Button></AlertDialogCancel>
          <AlertDialogAction asChild><Button onClick={() => { onOpenChange(false); onProceed?.(); }}>Let’s go</Button></AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function GuideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>How the tutorial works</AlertDialogTitle>
          <AlertDialogDescription>
            Follow the steps below. Each step links to the right screen to complete it. When
            you’re done, come back to this Tutorial page to take the next step. You can
            repeat or skip steps any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
          <li>Start at step 1 and open the linked page.</li>
          <li>Complete the action there (e.g. add business, customer, venue).</li>
          <li>Return to Tutorial to see the next recommended step.</li>
          <li>Once you’ve completed a few, jump ahead whenever you like.</li>
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel asChild><Button variant="outline">Close</Button></AlertDialogCancel>
          <AlertDialogAction asChild><Button onClick={() => onOpenChange(false)}>Got it</Button></AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function QuickStep({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 font-medium">
          {icon}
          <span>{title}</span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">{children}</div>
      </div>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full inline-block bg-black dark:bg-primary ring-2 ring-black/20 dark:ring-primary/30" />
      <span className="text-muted-foreground">{children}</span>
    </div>
  )
}


