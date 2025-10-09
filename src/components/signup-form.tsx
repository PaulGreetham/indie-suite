"use client"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { emailPasswordSignUp } from "@/lib/firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { sendEmailVerification } from "firebase/auth"
// Using Hosted Checkout URL redirection

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const search = useSearchParams()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  // continuation handled on /signup/verified

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const email = (form.querySelector("#email") as HTMLInputElement).value
    const password = (form.querySelector("#password") as HTMLInputElement).value
    const confirm = (form.querySelector("#confirm_password") as HTMLInputElement)?.value
    if (confirm !== undefined && password !== confirm) {
      setError("Passwords do not match")
      return
    }
    try {
      setSubmitting(true)
      await emailPasswordSignUp(email, password)
      const user = getFirebaseAuth().currentUser
      if (user) {
        await sendEmailVerification(user)
      }
      setInfo("Verification email sent. Please check your inbox to confirm your account.")
      // Redirect to a dedicated screen
      window.location.href = `/signup/verified?plan=${encodeURIComponent(search.get("plan") || "pro")}`
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign up")
    } finally {
      setSubmitting(false)
    }
  }

  // continueToCheckout moved to /signup/verified
  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={onSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your details below to get started
        </p>
      </div>
      <div className="grid gap-6">
        {error ? (<p className="text-sm text-destructive">{error}</p>) : null}
        {info ? (<p className="text-sm text-green-600 dark:text-green-400">{info}</p>) : null}
        <div className="grid gap-3">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" type="text" placeholder="Jane Doe" required />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="confirm_password">Confirm password</Label>
          <Input id="confirm_password" name="confirm_password" type="password" required />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          Sign up
        </Button>
        {/* The dedicated verified page handles continuation */}
      </div>
      <div className="text-center text-sm">
        Already have an account?{" "}
        <a href="/login" className="underline underline-offset-4">
          Log in
        </a>
      </div>
    </form>
  )
}
