"use client"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { emailPasswordSignIn, sendPasswordReset } from "@/lib/firebase/auth"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetStatus, setResetStatus] = useState<string | null>(null)
  const emailInputRef = useRef<HTMLInputElement | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const email = (form.querySelector("#email") as HTMLInputElement).value
    const password = (form.querySelector("#password") as HTMLInputElement).value
    setSubmitting(true)
    emailPasswordSignIn(email, password)
      .then(() => router.push("/dashboard/overview"))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to sign in"))
      .finally(() => setSubmitting(false))
  }
  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={onSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Login to your account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your email below to login to your account
        </p>
      </div>
      <div className="grid gap-6">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        <div className="grid gap-3">
          <div className="flex items-center">
            <Label htmlFor="email">Email</Label>
          </div>
          <Input id="email" type="email" placeholder="m@example.com" required ref={emailInputRef} />
        </div>
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              className="ml-auto text-sm underline-offset-4 hover:underline"
              onClick={() => {
                // Prefill from current email field when opening
                const currentEmail = emailInputRef.current?.value ?? ""
                setResetEmail(currentEmail)
                setResetStatus(null)
                setResetOpen(true)
              }}
            >
              Forgot your password?
            </button>
          </div>
          <Input id="password" type="password" required />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          Login
        </Button>
        {/* Social login removed per requirements */}
      </div>

      {/* Reset password dialog */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset your password</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your email and we&apos;ll send a password reset link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-3">
            <Label htmlFor="reset-email">Email</Label>
            <Input id="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@example.com" />
            {resetStatus ? <p className="text-sm text-muted-foreground">{resetStatus}</p> : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!resetEmail) {
                  setResetStatus("Please enter your email address.")
                  return
                }
                try {
                  await sendPasswordReset(resetEmail)
                  setResetStatus("If an account exists, a reset link has been sent.")
                } catch (err) {
                  setResetStatus(err instanceof Error ? err.message : "Failed to send reset email")
                }
              }}
            >
              Send reset link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Forgot email flow removed per requirements */}
      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <a href="/signup" className="underline underline-offset-4">
          Sign up
        </a>
      </div>
    </form>
  )
}
