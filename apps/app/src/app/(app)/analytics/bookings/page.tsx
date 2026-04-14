"use client"

import { AnalyticsPageHeader } from "@/components/analytics/AnalyticsPageHeader"
import { BookingsBarChart } from "@/components/analytics/BookingsBarChart"
import { BookingsMetrics } from "@/components/analytics/BookingsMetrics"
import { useDateFilterState } from "@/hooks/use-date-filter-state"
import { useBookingsAnalyticsData } from "../../../../hooks/use-bookings-analytics-data"

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
  const { loading, error, metrics, chartData } = useBookingsAnalyticsData(filter)

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
      <div className="mb-3">
        <BookingsMetrics
          loading={loading}
          error={error}
          metrics={metrics}
          filter={filter}
        />
      </div>
      <BookingsBarChart loading={loading} data={chartData} filter={filter} />
    </div>
  )
}


