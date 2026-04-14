import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { RevenueMetrics } from "../RevenueMetrics"
import type { SharedDateFilterState } from "@/lib/filters/date-time-filter"
import type { RevenueMetricsData } from "@/hooks/use-revenue-analytics-data"

vi.mock("@/components/ui/number-ticker", () => ({
  NumberTicker: ({
    value,
    decimalPlaces = 0,
    className,
  }: {
    value: number
    decimalPlaces?: number
    className?: string
  }) => (
    <span className={className}>
      {new Intl.NumberFormat("en-GB", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(value)}
    </span>
  ),
}))

const filter: SharedDateFilterState = {
  filterMode: "preset",
  timeRange: "this-month",
  timeRanges: [{ value: "this-month", label: "This month" }],
  dateTimeRange: {
    mode: "range",
  },
}

const metrics: RevenueMetricsData = {
  currency: "GBP",
  paid: 1234.5,
  futureUnpaid: 4321,
  numPaidInvoices: 3,
  numFutureUnpaidInvoices: 2,
  numOverdueInvoices: 1,
  totalOverdueAmount: 99,
  next4WeeksTotal: 2500,
  next4WeeksCount: 4,
}

describe("RevenueMetrics", () => {
  it("renders the key revenue cards for the active filter", () => {
    render(
      <RevenueMetrics
        loading={false}
        error={null}
        metrics={metrics}
        filter={filter}
      />
    )

    expect(screen.getByText("Total paid revenue")).toBeInTheDocument()
    expect(screen.getByText("1,234.50")).toBeInTheDocument()
    expect(screen.getByText("3 paid invoices in This month")).toBeInTheDocument()
    expect(screen.getByText("2 outstanding invoices in This month")).toBeInTheDocument()
    expect(screen.getByText("4 invoices in filtered range")).toBeInTheDocument()
    expect(screen.getByText("1 overdue invoice in This month")).toBeInTheDocument()
  })
})
