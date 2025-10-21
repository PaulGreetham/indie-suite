"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"

const LANGUAGE_STORAGE_KEY = "appLanguage"

export default function SettingsGeneralPage() {
  const [language, setLanguage] = React.useState<string>("en")

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
    </div>
  )
}


