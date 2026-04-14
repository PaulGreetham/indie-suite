import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { BookingsMetrics } from "../BookingsMetrics"
import type { SharedDateFilterState } from "@/lib/filters/date-time-filter"
import type { BookingsMetricsData } from "@/hooks/use-bookings-analytics-data"

vi.mock("@/components/ui/number-ticker", () => ({
  NumberTicker: ({
    value,
    className,
  }: {
    value: number
    className?: string
  }) => <span className={className}>{value.toLocaleString("en-GB")}</span>,
}))

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="metric-skeleton" className={className} />
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

const metrics: BookingsMetricsData = {
  totalInRange: 12,
  upcoming: 7,
  next4Weeks: 4,
  completed: 5,
}

describe("BookingsMetrics", () => {
  it("renders the key booking cards for the active filter", () => {
    render(
      <BookingsMetrics
        loading={false}
        error={null}
        metrics={metrics}
        filter={filter}
      />
    )

    expect(screen.getByText("Total bookings")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
    expect(screen.getByText("This month")).toBeInTheDocument()
    expect(screen.getByText("Upcoming bookings")).toBeInTheDocument()
    expect(screen.getByText("7")).toBeInTheDocument()
    expect(screen.getByText("from today")).toBeInTheDocument()
    expect(screen.getByText("Bookings in next 4 weeks")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("next 28 days")).toBeInTheDocument()
    expect(screen.getByText("Completed bookings")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("before today")).toBeInTheDocument()
  })

  it("shows loading placeholders and preserves the error message", () => {
    render(
      <BookingsMetrics
        loading
        error="Failed to load bookings"
        metrics={metrics}
        filter={filter}
      />
    )

    expect(screen.getAllByTestId("metric-skeleton")).toHaveLength(4)
    expect(screen.getByText("Failed to load bookings")).toBeInTheDocument()
  })
})
