"use client"

import { NotificationFeed } from "@/components/NotificationFeed"
import { AnalyticsPageHeader } from "@/components/analytics/AnalyticsPageHeader"
import { OverviewDonutRevenue } from "../../../../components/analytics/OverviewDonutRevenue"
import { OverviewRadarGigs } from "../../../../components/analytics/OverviewRadarGigs"
import { OverviewTopCustomers } from "../../../../components/analytics/OverviewTopCustomers"
import { OverviewDonutRevenueByYear } from "../../../../components/analytics/OverviewDonutRevenueByYear"
import { useDateFilterState } from "@/hooks/use-date-filter-state"

export default function OverviewPage() {
  const {
    timeRanges,
    timeRange,
    setTimeRange,
    filterMode,
    setFilterMode,
    dateTimeRange,
    setDateTimeRange,
    filter,
  } = useDateFilterState()

  return (
    <div className="p-1">
      <AnalyticsPageHeader
        title="Overview"
        timeRanges={timeRanges}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        dateTimeRange={dateTimeRange}
        onDateTimeRangeChange={setDateTimeRange}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
      />
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <OverviewDonutRevenueByYear filter={filter} />
        <OverviewDonutRevenue filter={filter} />
        <OverviewRadarGigs filter={filter} />
        <OverviewTopCustomers filter={filter} />
      </div>

      <NotificationFeed limit={5} />
    </div>
  )
}


