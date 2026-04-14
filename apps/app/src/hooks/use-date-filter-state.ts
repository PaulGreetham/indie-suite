"use client"

import * as React from "react"

import {
  getAnalyticsTimeRanges,
  type FilterMode,
  type SharedDateFilterState,
  withDefaultDateTimeRange,
} from "@/lib/filters/date-time-filter"

export function useDateFilterState(defaultTimeRange = "all") {
  const timeRanges = React.useMemo(() => getAnalyticsTimeRanges(), [])
  const [timeRange, setTimeRange] = React.useState(defaultTimeRange)
  const [filterMode, setFilterMode] = React.useState<FilterMode>("preset")
  const [dateTimeRange, setDateTimeRange] = React.useState(
    withDefaultDateTimeRange()
  )

  const filter = React.useMemo<SharedDateFilterState>(
    () => ({
      timeRanges,
      timeRange,
      dateTimeRange,
      filterMode,
    }),
    [dateTimeRange, filterMode, timeRange, timeRanges]
  )

  return {
    timeRanges,
    timeRange,
    setTimeRange,
    filterMode,
    setFilterMode,
    dateTimeRange,
    setDateTimeRange,
    filter,
  }
}
