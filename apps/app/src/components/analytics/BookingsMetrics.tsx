"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

function BookingsMetricFooter({
  loading,
  children,
}: {
  loading: boolean
  children: string
}) {
  return (
    <CardFooter className="min-h-[2.5rem] flex-col items-start gap-1 px-7 pt-0 text-xs leading-tight text-muted-foreground sm:px-8">
      {loading ? (
        <Skeleton className="h-3 w-28 bg-muted/60 dark:bg-muted/40" />
      ) : (
        <span>{children}</span>
      )}
    </CardFooter>
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
          <div className="text-3xl font-semibold leading-none">
            {loading ? "--" : <NumberTicker value={totalInRange} className="inline" />}
          </div>
          <div className="text-xs leading-snug text-muted-foreground">
            {loading ? (
              <span className="invisible">All time</span>
            ) : (
              activeLabel
            )}
          </div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <Card className="gap-4 py-4">
        <CardHeader className="px-7 pb-0 sm:px-8">
          <CardTitle className="text-sm font-medium">Total bookings</CardTitle>
        </CardHeader>
        <CardContent className="px-7 pb-0 pt-0 sm:px-8">
          <BookingsMetricValue loading={loading} value={metrics.totalInRange} />
          {error ? (
            <CardDescription className="mt-2 text-xs text-red-500">
              {error}
            </CardDescription>
          ) : null}
        </CardContent>
        <BookingsMetricFooter loading={loading}>{activeLabel}</BookingsMetricFooter>
      </Card>

      <Card className="gap-0 py-3.5">
        <CardHeader className="px-5 pb-1 sm:px-6">
          <CardTitle className="text-sm font-medium">Upcoming bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-5 pt-0 sm:px-6">
          <div className="text-3xl font-semibold leading-none">
            {loading ? "--" : <NumberTicker value={upcoming} className="inline" />}
          </div>
          <div className="text-xs leading-snug text-muted-foreground">
            <span className={loading ? "invisible" : undefined}>from today</span>
          </div>
      <Card className="gap-4 py-4">
        <CardHeader className="px-7 pb-0 sm:px-8">
          <CardTitle className="text-sm font-medium">Upcoming bookings</CardTitle>
        </CardHeader>
        <CardContent className="px-7 pb-0 pt-0 sm:px-8">
          <BookingsMetricValue loading={loading} value={metrics.upcoming} />
        </CardContent>
        <BookingsMetricFooter loading={loading}>from today</BookingsMetricFooter>
      </Card>

      <Card className="gap-0 py-3.5">
        <CardHeader className="px-5 pb-1 sm:px-6">
          <CardTitle className="text-sm font-medium">Bookings in next 4 weeks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-5 pt-0 sm:px-6">
          <div className="text-3xl font-semibold leading-none">
            {loading ? "--" : <NumberTicker value={next4Weeks} className="inline" />}
          </div>
          <div className="text-xs leading-snug text-muted-foreground">
            <span className={loading ? "invisible" : undefined}>next 28 days</span>
          </div>
      <Card className="gap-4 py-4">
        <CardHeader className="px-7 pb-0 sm:px-8">
          <CardTitle className="text-sm font-medium">Bookings in next 4 weeks</CardTitle>
        </CardHeader>
        <CardContent className="px-7 pb-0 pt-0 sm:px-8">
          <BookingsMetricValue loading={loading} value={metrics.next4Weeks} />
        </CardContent>
        <BookingsMetricFooter loading={loading}>next 28 days</BookingsMetricFooter>
      </Card>

      <Card className="gap-0 py-3.5">
        <CardHeader className="px-5 pb-1 sm:px-6">
          <CardTitle className="text-sm font-medium">Completed bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-5 pt-0 sm:px-6">
          <div className="text-3xl font-semibold leading-none">
            {loading ? "--" : <NumberTicker value={completed} className="inline" />}
          </div>
          <div className="text-xs leading-snug text-muted-foreground">
            <span className={loading ? "invisible" : undefined}>before today</span>
          </div>
          {error ? <div className="text-xs text-red-500">{error}</div> : null}
      <Card className="gap-4 py-4">
        <CardHeader className="px-7 pb-0 sm:px-8">
          <CardTitle className="text-sm font-medium">Completed bookings</CardTitle>
        </CardHeader>
        <CardContent className="px-7 pb-0 pt-0 sm:px-8">
          <BookingsMetricValue loading={loading} value={metrics.completed} />
        </CardContent>
        <BookingsMetricFooter loading={loading}>before today</BookingsMetricFooter>
      </Card>
    </div>
  )
}
