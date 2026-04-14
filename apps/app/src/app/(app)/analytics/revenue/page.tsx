"use client"

import { AnalyticsPageHeader } from "@/components/analytics/AnalyticsPageHeader"
import { RevenueChart } from "@/components/analytics/RevenueChart"
import { RevenueMetrics } from "@/components/analytics/RevenueMetrics"
import { useDateFilterState } from "@/hooks/use-date-filter-state"

export default function RevenuePage() {
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
    <div className="space-y-4 p-1">
      <AnalyticsPageHeader
        title="Revenue"
        timeRanges={timeRanges}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        dateTimeRange={dateTimeRange}
        onDateTimeRangeChange={setDateTimeRange}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
      />
      <RevenueMetrics filter={filter} />
      <RevenueChart className="w-full" filter={filter} />
    </div>
  )
}


