"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { fetchSubscription } from "@/lib/stripe/billing-client"

interface PlanGuardProps {
  children: React.ReactNode
}

// Renders the app only for users with a live plan (active, trialing or past_due). Everyone else,
// including when the check fails, is sent to /subscribe. Server routes and rules enforce the same rule.
export function PlanGuard({ children }: PlanGuardProps) {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchSubscription()
      .then((info) => info?.active === true)
      .catch(() => false)
      .then((active) => {
        if (cancelled) return
        setAllowed(active)
        if (!active) router.replace("/subscribe")
      })
    return () => { cancelled = true }
  }, [router])

  if (allowed === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Checking your plan...</p>
        </div>
      </div>
    )
  }

  if (!allowed) return null

  return <>{children}</>
}
