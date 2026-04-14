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
    <div className="p-1">
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
      <div className="mb-3">
        <RevenueMetrics
          loading={loading}
          error={error}
          metrics={metrics}
          filter={filter}
        />
      </div>
      <RevenueChart
        className="w-full"
        loading={loading}
        data={chartData}
        filter={filter}
      />
    </div>
  )
}


