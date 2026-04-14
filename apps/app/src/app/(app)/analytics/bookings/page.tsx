"use client"

import { AnalyticsPageHeader } from "@/components/analytics/AnalyticsPageHeader"
import { BookingsBarChart } from "@/components/analytics/BookingsBarChart"
import { BookingsMetrics } from "@/components/analytics/BookingsMetrics"
import { useDateFilterState } from "@/hooks/use-date-filter-state"

export default function BookingsPage() {
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
        title="Bookings"
        timeRanges={timeRanges}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        dateTimeRange={dateTimeRange}
        onDateTimeRangeChange={setDateTimeRange}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
      />
      <BookingsMetrics filter={filter} />
      <BookingsBarChart filter={filter} />
    </div>
  )
}


