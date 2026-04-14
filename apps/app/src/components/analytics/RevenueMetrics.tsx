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
import type { RevenueMetricsData } from "../../hooks/use-revenue-analytics-data"

function currencyToSymbol(code: string) {
  switch (code) {
    case "GBP":
      return "£"
    case "USD":
      return "$"
    case "EUR":
      return "€"
    default:
      return "£"
  }
}

type RevenueMetricsProps = {
  loading: boolean
  error: string | null
  metrics: RevenueMetricsData
  filter: SharedDateFilterState
}

function RevenueMetricValue({
  loading,
  currency,
  value,
}: {
  loading: boolean
  currency: string
  value: number
}) {
  if (loading) {
    return <Skeleton className="h-9 w-28 bg-muted/60 dark:bg-muted/40" />
  }

  return (
    <div className="text-3xl font-semibold tracking-tight">
      {currencyToSymbol(currency)}
      <NumberTicker
        value={value}
        decimalPlaces={Number.isInteger(value) ? 0 : 2}
        className="inline"
      />
    </div>
  )
}

function RevenueMetricText({
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

export function RevenueMetrics({
  loading,
  error,
  metrics,
  filter,
}: RevenueMetricsProps) {
  const activeLabel = getActiveFilterLabel(filter)

  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-4">
      <Card className="gap-0 py-3.5">
        <CardHeader className="px-5 pb-1 sm:px-6">
          <CardTitle className="text-sm font-medium">Total paid revenue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-5 pt-0 sm:px-6">
          <RevenueMetricValue
            loading={loading}
            currency={metrics.currency}
            value={metrics.paid}
          />
          {error ? (
            <CardDescription className="text-xs text-red-500">
              {error}
            </CardDescription>
          ) : null}
          <RevenueMetricText
            loading={loading}
            visibleText={`${metrics.numPaidInvoices} paid invoice${metrics.numPaidInvoices === 1 ? "" : "s"} in ${activeLabel}`}
            placeholderText={`0 paid invoice${metrics.numPaidInvoices === 1 ? "" : "s"} in ${activeLabel}`}
          />
        </CardContent>
      </Card>

      <Card className="gap-0 py-3.5">
        <CardHeader className="px-5 pb-1 sm:px-6">
          <CardTitle className="text-sm font-medium">Pipeline revenue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-5 pt-0 sm:px-6">
          <RevenueMetricValue
            loading={loading}
            currency={metrics.currency}
            value={metrics.futureUnpaid}
          />
          <RevenueMetricText
            loading={loading}
            visibleText={`${metrics.numFutureUnpaidInvoices} outstanding invoice${metrics.numFutureUnpaidInvoices === 1 ? "" : "s"} in ${activeLabel}`}
            placeholderText={`0 outstanding invoice${metrics.numFutureUnpaidInvoices === 1 ? "" : "s"} in ${activeLabel}`}
          />
        </CardContent>
      </Card>

      <Card className="gap-0 py-3.5">
        <CardHeader className="px-5 pb-1 sm:px-6">
          <CardTitle className="text-sm font-medium">Due in next 4 weeks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-5 pt-0 sm:px-6">
          <RevenueMetricValue
            loading={loading}
            currency={metrics.currency}
            value={metrics.next4WeeksTotal}
          />
          <RevenueMetricText
            loading={loading}
            visibleText={`${metrics.next4WeeksCount} invoice${metrics.next4WeeksCount === 1 ? "" : "s"} in filtered range`}
            placeholderText={`0 invoice${metrics.next4WeeksCount === 1 ? "" : "s"} in filtered range`}
          />
        </CardContent>
      </Card>

      <Card className="gap-0 py-3.5">
        <CardHeader className="px-5 pb-1 sm:px-6">
          <CardTitle className="text-sm font-medium">Overdue invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-5 pt-0 sm:px-6">
          <RevenueMetricValue
            loading={loading}
            currency={metrics.currency}
            value={metrics.totalOverdueAmount}
          />
          <RevenueMetricText
            loading={loading}
            visibleText={`${metrics.numOverdueInvoices} overdue invoice${metrics.numOverdueInvoices === 1 ? "" : "s"} in ${activeLabel}`}
            placeholderText={`0 overdue invoice${metrics.numOverdueInvoices === 1 ? "" : "s"} in ${activeLabel}`}
          />
        </CardContent>
      </Card>
    </div>
  )
}
