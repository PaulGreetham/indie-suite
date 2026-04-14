"use client"

import { AnalyticsPageHeader } from "@/components/analytics/AnalyticsPageHeader"
import { RevenueChart } from "@/components/analytics/RevenueChart"
import { RevenueMetrics } from "@/components/analytics/RevenueMetrics"
import { useDateFilterState } from "@/hooks/use-date-filter-state"
import { useRevenueAnalyticsData } from "../../../../hooks/use-revenue-analytics-data"

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
  const { loading, error, metrics, chartData } = useRevenueAnalyticsData(filter)

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
      <RevenueMetrics
        loading={loading}
        error={error}
        metrics={metrics}
        filter={filter}
      />
      <RevenueChart
        className="w-full"
        loading={loading}
        data={chartData}
        filter={filter}
      />
    </div>
  )
}


