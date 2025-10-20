"use client"

import * as React from "react"
import { NotificationFeed } from "@/components/NotificationFeed"
import { OverviewDonutRevenue } from "../../../../components/analytics/OverviewDonutRevenue"
import { OverviewRadarGigs } from "../../../../components/analytics/OverviewRadarGigs"
import { OverviewPieWeekdayBookings } from "../../../../components/analytics/OverviewPieWeekdayBookings"
import { OverviewTopCustomers } from "../../../../components/analytics/OverviewTopCustomers"

export default function OverviewPage() {
  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <OverviewDonutRevenue />
        <OverviewRadarGigs />
        <OverviewPieWeekdayBookings />
        <OverviewTopCustomers />
      </div>

      <NotificationFeed limit={5} />
    </div>
  )
}


