"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getActiveFilterLabel,
  type SharedDateFilterState,
} from "@/lib/filters/date-time-filter"
import type { BookingsMetricsData } from "../../hooks/use-bookings-analytics-data"

type BookingsMetricsProps = {
  loading: boolean
  error: string | null
  metrics: BookingsMetricsData
  filter: SharedDateFilterState
}

function BookingsMetricValue({
  loading,
  value,
}: {
  loading: boolean
  value: number
}) {
  if (loading) {
    return <Skeleton className="h-9 w-16 bg-muted/60 dark:bg-muted/40" />
  }

  return (
    <div className="text-3xl font-semibold tracking-tight">
      <NumberTicker value={value} className="inline" />
    </div>
  )
}

function BookingsMetricText({
  loading,
  visibleText,
  placeholderText,
}: {
  loading: boolean
  visibleText: string
  placeholderText: string
}) {
  return (
    <div className="text-xs leading-snug text-muted-foreground">
      {loading ? <span className="invisible">{placeholderText}</span> : visibleText}
    </div>
  )
}

export function BookingsMetrics({
  loading,
  error,
  metrics,
  filter,
}: BookingsMetricsProps) {
  const activeLabel = getActiveFilterLabel(filter)

  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-4">
      <Card className="gap-0 py-3.5">
        <CardHeader className="px-5 pb-1 sm:px-6">
          <CardTitle className="text-sm font-medium">Total bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-5 pt-0 sm:px-6">
          <BookingsMetricValue loading={loading} value={metrics.totalInRange} />
          {error ? (
            <CardDescription className="text-xs text-red-500">
              {error}
            </CardDescription>
          ) : null}
          <BookingsMetricText
            loading={loading}
            visibleText={activeLabel}
            placeholderText="All time"
          />
        </CardContent>
      </Card>

      <Card className="gap-0 py-3.5">
        <CardHeader className="px-5 pb-1 sm:px-6">
          <CardTitle className="text-sm font-medium">Upcoming bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-5 pt-0 sm:px-6">
          <BookingsMetricValue loading={loading} value={metrics.upcoming} />
          <BookingsMetricText
            loading={loading}
            visibleText="from today"
            placeholderText="from today"
          />
        </CardContent>
      </Card>

      <Card className="gap-0 py-3.5">
        <CardHeader className="px-5 pb-1 sm:px-6">
          <CardTitle className="text-sm font-medium">Bookings in next 4 weeks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-5 pt-0 sm:px-6">
          <BookingsMetricValue loading={loading} value={metrics.next4Weeks} />
          <BookingsMetricText
            loading={loading}
            visibleText="next 28 days"
            placeholderText="next 28 days"
          />
        </CardContent>
      </Card>

      <Card className="gap-0 py-3.5">
        <CardHeader className="px-5 pb-1 sm:px-6">
          <CardTitle className="text-sm font-medium">Completed bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-5 pt-0 sm:px-6">
          <BookingsMetricValue loading={loading} value={metrics.completed} />
          <BookingsMetricText
            loading={loading}
            visibleText="before today"
            placeholderText="before today"
          />
        </CardContent>
      </Card>
    </div>
  )
}
