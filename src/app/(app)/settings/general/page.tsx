"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { changeEmail, changePassword } from "@/lib/firebase/auth"

const LANGUAGE_STORAGE_KEY = "appLanguage"

export default function SettingsGeneralPage() {
  const [language, setLanguage] = React.useState<string>("en")
  const [emailSubmitting, setEmailSubmitting] = React.useState(false)
  const [pwdSubmitting, setPwdSubmitting] = React.useState(false)
  const [emailMsg, setEmailMsg] = React.useState<string | null>(null)
  const [pwdMsg, setPwdMsg] = React.useState<string | null>(null)

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
          <CardDescription>Update the email you use to sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault()
              const form = e.currentTarget as HTMLFormElement
              const currentPassword = (form.querySelector('#curpwd-email') as HTMLInputElement).value
              const newEmail = (form.querySelector('#new-email') as HTMLInputElement).value
              setEmailMsg(null)
              setEmailSubmitting(true)
              try {
                await changeEmail(currentPassword, newEmail)
                setEmailMsg('Email updated. Check your inbox to confirm any verification email.')
                form.reset()
              } catch (err) {
                setEmailMsg(err instanceof Error ? err.message : 'Failed to update email')
              } finally {
                setEmailSubmitting(false)
              }
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="new-email">New email</Label>
              <Input id="new-email" type="email" required placeholder="you@example.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="curpwd-email">Current password</Label>
              <Input id="curpwd-email" type="password" required />
            </div>
            {emailMsg ? <p className="text-sm text-muted-foreground">{emailMsg}</p> : null}
            <Button type="submit" disabled={emailSubmitting}>Update email</Button>
          </form>
        </CardContent>
      </Card>

      <div className="h-6" />

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Set a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault()
              const form = e.currentTarget as HTMLFormElement
              const currentPassword = (form.querySelector('#curpwd') as HTMLInputElement).value
              const newPassword = (form.querySelector('#newpwd') as HTMLInputElement).value
              const confirm = (form.querySelector('#newpwd2') as HTMLInputElement).value
              if (newPassword !== confirm) {
                setPwdMsg('Passwords do not match')
                return
              }
              setPwdMsg(null)
              setPwdSubmitting(true)
              try {
                await changePassword(currentPassword, newPassword)
                setPwdMsg('Password updated successfully')
                form.reset()
              } catch (err) {
                setPwdMsg(err instanceof Error ? err.message : 'Failed to update password')
              } finally {
                setPwdSubmitting(false)
              }
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="curpwd">Current password</Label>
              <Input id="curpwd" type="password" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newpwd">New password</Label>
              <Input id="newpwd" type="password" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newpwd2">Confirm new password</Label>
              <Input id="newpwd2" type="password" required />
            </div>
            {pwdMsg ? <p className="text-sm text-muted-foreground">{pwdMsg}</p> : null}
            <Button type="submit" disabled={pwdSubmitting}>Update password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


