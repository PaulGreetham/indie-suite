"use client"

import * as React from "react"
import { NotificationFeed } from "@/components/NotificationFeed"
import { DateTimeFilter } from "@/components/filters/date-time-filter"
import { OverviewDonutRevenue } from "../../../../components/analytics/OverviewDonutRevenue"
import { OverviewRadarGigs } from "../../../../components/analytics/OverviewRadarGigs"
import { OverviewTopCustomers } from "../../../../components/analytics/OverviewTopCustomers"
import { OverviewDonutRevenueByYear } from "../../../../components/analytics/OverviewDonutRevenueByYear"
import {
  getOverviewTimeRanges,
  withDefaultDateTimeRange,
} from "@/lib/filters/date-time-filter"

export default function OverviewPage() {
  const timeRanges = React.useMemo(() => getOverviewTimeRanges(), [])
  const [timeRange, setTimeRange] = React.useState("all")
  const [filterMode, setFilterMode] = React.useState<"preset" | "dateTime">("preset")
  const [dateTimeRange, setDateTimeRange] = React.useState(
    withDefaultDateTimeRange()
  )

  const sharedFilter = React.useMemo(
    () => ({
      timeRanges,
      timeRange,
      dateTimeRange,
      filterMode,
    }),
    [dateTimeRange, filterMode, timeRange, timeRanges]
  )

  return (
    <div className="p-1">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <DateTimeFilter
          timeRanges={timeRanges}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          dateTimeRange={dateTimeRange}
          onDateTimeRangeChange={setDateTimeRange}
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
        />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <OverviewDonutRevenueByYear filter={sharedFilter} />
        <OverviewDonutRevenue filter={sharedFilter} />
        <OverviewRadarGigs filter={sharedFilter} />
        <OverviewTopCustomers filter={sharedFilter} />
      </div>

      <NotificationFeed limit={5} />
    </div>
  )
}


