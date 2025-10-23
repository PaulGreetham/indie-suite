"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { sendPasswordReset, requestEmailChange } from "@/lib/firebase/auth"
import { useAuth } from "@/lib/firebase/auth-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const LANGUAGE_STORAGE_KEY = "appLanguage"

export default function SettingsGeneralPage() {
  const [language, setLanguage] = React.useState<string>("en")
  const { user } = useAuth()
  const [emailChangeOpen, setEmailChangeOpen] = React.useState(false)
  const [newEmail, setNewEmail] = React.useState("")
  const [emailPending, setEmailPending] = React.useState(false)
  const [passwordPending, setPasswordPending] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY) : null
    if (stored) setLanguage(stored)
  }, [])

  const handleChange = (next: string) => {
    setLanguage(next)
    if (typeof window !== "undefined") window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
  }

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-4">General</h1>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Language</CardTitle>
          <CardDescription>Select your preferred language for the app UI.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Select
              value={language}
              onChange={handleChange}
              options={[
                { value: "en", label: "English" },
                // Add more languages here in the future
              ]}
              placeholder="Select language"
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      <div className="h-6" />

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Change email</CardTitle>
          <CardDescription>
            Send a verification email via Firebase to update your sign-in email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {statusMsg ? <p className="text-sm text-muted-foreground">{statusMsg}</p> : null}
            <AlertDialog open={emailChangeOpen} onOpenChange={(open) => {
              setEmailChangeOpen(open)
              if (!open) setNewEmail("")
            }}>
              <AlertDialogTrigger asChild>
                <Button>Request email change</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Change your sign-in email</AlertDialogTitle>
                  <AlertDialogDescription>
                    Enter the new email. We'll send a verification link via Firebase.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-2">
                  <Label htmlFor="dialog-new-email">New email</Label>
                  <Input id="dialog-new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      if (!newEmail) return
                      setStatusMsg(null)
                      setEmailPending(true)
                      try {
                        await requestEmailChange(newEmail)
                        setStatusMsg('Verification sent. Check the new email inbox to confirm the change.')
                        setEmailChangeOpen(false)
                        setNewEmail("")
                      } catch (err) {
                        setStatusMsg(err instanceof Error ? err.message : 'Failed to request email change')
                      } finally {
                        setEmailPending(false)
                      }
                    }}
                    disabled={emailPending || !newEmail}
                  >
                    {emailPending ? 'Sending…' : 'Send verification'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <div className="h-6" />

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            Send a Firebase password reset email to your current address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!user?.email || passwordPending}>Send password reset email</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset your password?</AlertDialogTitle>
                  <AlertDialogDescription>
                    We'll email a reset link to {user?.email ?? 'your address'}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      if (!user?.email) return
                      setPasswordPending(true)
                      setStatusMsg(null)
                      try {
                        await sendPasswordReset(user.email)
                        setStatusMsg('Password reset email sent. Check your inbox.')
                      } catch (err) {
                        setStatusMsg(err instanceof Error ? err.message : 'Failed to send password reset email')
                      } finally {
                        setPasswordPending(false)
                      }
                    }}
                  >
                    {passwordPending ? 'Sending…' : 'Send email'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {statusMsg ? <p className="text-sm text-muted-foreground">{statusMsg}</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


