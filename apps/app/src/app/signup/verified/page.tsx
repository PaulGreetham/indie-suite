"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { sendEmailVerification } from "firebase/auth"
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
  const [email, setEmail] = useState<string | null>(null)
  const [status, setStatus] = useState<"checking" | "unverified" | "verified">("checking")
  const [busy, setBusy] = useState(false)
  const plan = search.get("plan") || "pro"
  const interval = search.get("interval") === "yearly" ? "yearly" : "monthly"

  useEffect(() => {
    const auth = getFirebaseAuth()
    const u = auth.currentUser
    setEmail(u?.email || null)
    if (!u) {
      setStatus("unverified")
      return
    }
    setStatus(u.emailVerified ? "verified" : "unverified")
  }, [])

  async function resend() {
    const u = getFirebaseAuth().currentUser
    if (!u) return
    await sendEmailVerification(u)
    alert("Verification email sent again.")
  }

  async function postWithToken(path: string, token: string) {
    return fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan, interval }),
    })
  }

  async function startTrial() {
    setBusy(true)
    try {
      const u = getFirebaseAuth().currentUser
      if (!u) throw new Error("Please sign in again")
      await u.reload()
      if (!u.emailVerified) throw new Error("Please verify via the email link first")
      // Force a fresh ID token so it carries email_verified=true, which the billing routes require
      const token = await u.getIdToken(true)
      const labelMap: Record<string, string> = { pro: "Pro", "pro-plus": "Portfolio", "pro-plus-plus": "Agency" }
      window.localStorage?.setItem?.("subscriptionPlan", labelMap[plan] || "Pro")

      const res = await postWithToken("/api/stripe/start-trial", token)
      if (res.ok) {
        window.location.href = "/dashboard/overview"
        return
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (body.error !== "trial_used") throw new Error("Unable to start your free trial")

      // Trial already used: subscribe through Stripe Checkout instead
      const checkout = await postWithToken("/api/stripe/create-checkout-session", token)
      const json = (await checkout.json().catch(() => ({}))) as { url?: string }
      if (!checkout.ok || !json.url) throw new Error("Failed to start checkout")
      window.location.href = json.url
    } catch (e) {
      alert(e instanceof Error ? e.message : "Unable to continue")
    } finally {
      setBusy(false)
    }
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
          <Button className="w-full" onClick={startTrial} disabled={busy}>
            {busy ? "Checking…" : status === "verified" ? "Start my 3-month free trial" : "I've verified, continue"}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={resend} disabled={busy}>
            Resend verification email
          </Button>
        </div>
      </div>
    </div>
  )
}


