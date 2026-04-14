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

function RevenueMetricFooter({
  loading,
  children,
}: {
  loading: boolean
  children: string
}) {
  return (
    <CardFooter className="min-h-[2.5rem] flex-col items-start gap-1 px-7 pt-0 text-xs leading-tight text-muted-foreground sm:px-8">
      {loading ? (
        <Skeleton className="h-3 w-40 bg-muted/60 dark:bg-muted/40" />
      ) : (
        <span>{children}</span>
      )}
    </CardFooter>
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
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <Card className="gap-4 py-4">
        <CardHeader className="px-7 pb-0 sm:px-8">
          <CardTitle className="text-sm font-medium">Total paid revenue</CardTitle>
        </CardHeader>
        <CardContent className="px-7 pb-0 pt-0 sm:px-8">
          <RevenueMetricValue
            loading={loading}
            currency={metrics.currency}
            value={metrics.paid}
          />
          {error ? (
            <CardDescription className="mt-2 text-xs text-red-500">
              {error}
            </CardDescription>
          ) : null}
        </CardContent>
        <RevenueMetricFooter loading={loading}>
          {`${metrics.numPaidInvoices} paid invoice${metrics.numPaidInvoices === 1 ? "" : "s"} in ${activeLabel}`}
        </RevenueMetricFooter>
      </Card>

      <Card className="gap-4 py-4">
        <CardHeader className="px-7 pb-0 sm:px-8">
          <CardTitle className="text-sm font-medium">Pipeline revenue</CardTitle>
        </CardHeader>
        <CardContent className="px-7 pb-0 pt-0 sm:px-8">
          <RevenueMetricValue
            loading={loading}
            currency={metrics.currency}
            value={metrics.futureUnpaid}
          />
        </CardContent>
        <RevenueMetricFooter loading={loading}>
          {`${metrics.numFutureUnpaidInvoices} outstanding invoice${metrics.numFutureUnpaidInvoices === 1 ? "" : "s"} in ${activeLabel}`}
        </RevenueMetricFooter>
      </Card>

      <Card className="gap-4 py-4">
        <CardHeader className="px-7 pb-0 sm:px-8">
          <CardTitle className="text-sm font-medium">Due in next 4 weeks</CardTitle>
        </CardHeader>
        <CardContent className="px-7 pb-0 pt-0 sm:px-8">
          <RevenueMetricValue
            loading={loading}
            currency={metrics.currency}
            value={metrics.next4WeeksTotal}
          />
        </CardContent>
        <RevenueMetricFooter loading={loading}>
          {`${metrics.next4WeeksCount} invoice${metrics.next4WeeksCount === 1 ? "" : "s"} in filtered range`}
        </RevenueMetricFooter>
      </Card>

      <Card className="gap-4 py-4">
        <CardHeader className="px-7 pb-0 sm:px-8">
          <CardTitle className="text-sm font-medium">Overdue invoices</CardTitle>
        </CardHeader>
        <CardContent className="px-7 pb-0 pt-0 sm:px-8">
          <RevenueMetricValue
            loading={loading}
            currency={metrics.currency}
            value={metrics.totalOverdueAmount}
          />
        </CardContent>
        <RevenueMetricFooter loading={loading}>
          {`${metrics.numOverdueInvoices} overdue invoice${metrics.numOverdueInvoices === 1 ? "" : "s"} in ${activeLabel}`}
        </RevenueMetricFooter>
      </Card>
    </div>
  )
}
