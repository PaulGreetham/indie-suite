"use client"

import * as React from "react"
import { NotificationFeed } from "@/components/NotificationFeed"
import Link from "next/link"

export default function OverviewPage() {
  const [showPrompt, setShowPrompt] = React.useState(false)
  React.useEffect(() => {
    // Lightweight client check – if no trading details have been created yet, suggest adding them
    // We don't query Firestore here to keep it simple; hide after user dismisses
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("dismiss_trading_prompt") === "1"
      if (!dismissed) setShowPrompt(true)
    }
  }, [])
  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold">Overview</h1>
      {showPrompt && (
        <div className="mt-4 border rounded-md p-3 bg-muted/30 flex items-center justify-between">
          <div className="text-sm">
            Add your trading details to personalize invoices and emails.
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings/trading-details" className="underline text-sm">Add now</Link>
            <button className="text-xs text-muted-foreground hover:underline" onClick={() => { localStorage.setItem("dismiss_trading_prompt", "1"); setShowPrompt(false) }}>Dismiss</button>
          </div>
        </div>
      )}

      <NotificationFeed />
    </div>
  )
}


