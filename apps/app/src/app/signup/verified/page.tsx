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

  function continueToCheckout() {
    setBusy(true)
    const auth = getFirebaseAuth()
    const u = auth.currentUser
    if (!u) { alert("Please sign in again"); setBusy(false); return }
    u.reload()
      .then(() => {
        if (!u.emailVerified) { throw new Error("Please verify via the email link first") }
        const labelMap: Record<string, string> = { pro: "Pro", "pro-plus": "Pro +", "pro-plus-plus": "Pro ++" }
        if (typeof window !== "undefined") window.localStorage?.setItem?.("subscriptionPlan", labelMap[plan] || "Pro")
        return fetch("/api/stripe/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, email: u.email || "" }),
        })
      })
      .then((res) => {
        if (!res) return null
        if (!res.ok) { alert("Failed to start checkout"); return null }
        return res.json()
      })
      .then((json) => {
        if (!json) return
        const url = (json as { url?: string }).url
        if (url) window.location.href = url
      })
      .catch((e: unknown) => {
        alert(e instanceof Error ? e.message : "Unable to continue")
      })
      .finally(() => setBusy(false))
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
          <Button className="w-full" onClick={continueToCheckout} disabled={busy}>
            {status === "verified" ? "Continue to checkout" : busy ? "Checking…" : "I've verified, continue"}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={resend} disabled={busy}>
            Resend verification email
          </Button>
        </div>
      </div>
    </div>
  )
}


