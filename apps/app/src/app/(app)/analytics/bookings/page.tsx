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
    <div className="p-1">
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
      <div className="mb-3">
        <BookingsMetrics filter={filter} />
      </div>
      <BookingsBarChart filter={filter} />
    </div>
  )
}


