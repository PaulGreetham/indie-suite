"use client"

import * as React from "react"
import { NotificationFeed } from "@/components/NotificationFeed"
import { OverviewDonutRevenue } from "../../../../components/analytics/OverviewDonutRevenue"

export default function OverviewPage() {
  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <OverviewDonutRevenue />
        <div className="rounded-md border min-h-[330px] flex items-center justify-center text-sm text-muted-foreground">
          Coming soon
        </div>
        <div className="rounded-md border min-h-[330px] flex items-center justify-center text-sm text-muted-foreground">
          Coming soon
        </div>
      </div>

      <NotificationFeed />
    </div>
  )
}


