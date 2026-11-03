"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { sendVerificationEmail } from "@/lib/firebase/auth"
import { useAuth } from "@/lib/firebase/auth-context"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SignupVerifiedPage() {
  return (
    <Suspense fallback={<div className="min-h-svh grid place-items-center p-6">Loading…</div>}>
      <VerifiedContent />
    </Suspense>
  )
}

function VerifiedContent() {
  const search = useSearchParams()
  // Shared auth state, so the page waits for Firebase to restore the session instead of reading it once (SU-12)
  const { user, loading } = useAuth()
  const [busy, setBusy] = useState(false)
  const plan = search.get("plan") || "pro"
  const interval = search.get("interval") === "yearly" ? "yearly" : "monthly"
  const email = user?.email || null

  async function resend() {
    const u = getFirebaseAuth().currentUser
    if (!u) return
    await sendVerificationEmail(u, `/signup/verified?plan=${encodeURIComponent(plan)}&interval=${interval}`)
    alert("Verification email sent again.")
  }

  async function continueToPlans() {
    setBusy(true)
    try {
      const u = getFirebaseAuth().currentUser
      if (!u) throw new Error("Please sign in again")
      await u.reload()
      if (!u.emailVerified) throw new Error("Please verify via the email link first")
      // Refresh the cached ID token so it carries email_verified=true, which the billing routes require
      await u.getIdToken(true)
      // Pick a plan first; /subscribe then sends the user to Stripe Checkout to add a card and start the trial
      window.location.href = `/subscribe?plan=${encodeURIComponent(plan)}&interval=${interval}`
    } catch (e) {
      alert(e instanceof Error ? e.message : "Unable to continue")
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="min-h-svh grid place-items-center p-6 text-sm text-muted-foreground">Loading…</div>
  }

  // Signed out on this device (e.g. the email link was opened on another device): log in to continue
  if (!user) {
    return (
      <div className="min-h-svh grid place-items-center p-6">
        <div className="w-full max-w-md space-y-5 text-center">
          <h1 className="text-2xl font-semibold">Log in to continue</h1>
          <p className="text-sm text-muted-foreground">
            Once your email is verified, log in to choose your plan and start your free trial.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh grid place-items-center p-6">
      <Link href="/signup" className="absolute right-4 top-4 text-sm text-muted-foreground hover:underline">Cancel</Link>
      <div className="w-full max-w-md space-y-5 text-center">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification link {email ? `to ${email}` : "to your email"}. Please
          verify your account to continue.
        </p>
        <div className="space-y-3">
          <Button className="w-full" onClick={continueToPlans} disabled={busy}>
            {busy ? "Checking…" : user.emailVerified ? "Choose my plan" : "I've verified, continue"}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={resend} disabled={busy}>
            Resend verification email
          </Button>
        </div>
      </div>
    </div>
  )
}


