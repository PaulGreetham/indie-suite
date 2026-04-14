"use client"

import { DateTimeFilter } from "@/components/filters/date-time-filter"
import type {
  DateTimeRangeValue,
  FilterMode,
  TimeRangeOption,
} from "@/lib/filters/date-time-filter"

type AnalyticsPageHeaderProps = {
  title: string
  timeRanges: TimeRangeOption[]
  timeRange: string
  onTimeRangeChange: (value: string) => void
  dateTimeRange: DateTimeRangeValue
  onDateTimeRangeChange: (value: DateTimeRangeValue) => void
  filterMode: FilterMode
  onFilterModeChange: (mode: FilterMode) => void
}

export function AnalyticsPageHeader({
  title,
  timeRanges,
  timeRange,
  onTimeRangeChange,
  dateTimeRange,
  onDateTimeRangeChange,
  filterMode,
  onFilterModeChange,
}: AnalyticsPageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <DateTimeFilter
        timeRanges={timeRanges}
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        dateTimeRange={dateTimeRange}
        onDateTimeRangeChange={onDateTimeRangeChange}
        filterMode={filterMode}
        onFilterModeChange={onFilterModeChange}
      />
    </div>
  )
}
