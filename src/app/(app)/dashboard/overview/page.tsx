"use client"

import * as React from "react"
import { NotificationFeed } from "@/components/NotificationFeed"

export default function OverviewPage() {
  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold">Overview</h1>

      <NotificationFeed />
    </div>
  )
}


