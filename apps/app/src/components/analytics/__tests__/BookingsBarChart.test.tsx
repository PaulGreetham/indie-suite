import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { BookingsBarChart } from "../BookingsBarChart"
import type { SharedDateFilterState } from "@/lib/filters/date-time-filter"
import type { BookingsChartPoint } from "@/hooks/use-bookings-analytics-data"

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({
    children,
    className,
  }: {
    children: ReactNode
    className?: string
  }) => (
    <div data-testid="chart-container" className={className}>
      {children}
    </div>
  ),
  ChartTooltip: ({ content }: { content?: ReactNode }) => (
    <div data-testid="chart-tooltip">{content}</div>
  ),
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content" />,
}))

vi.mock("recharts", () => ({
  BarChart: ({
    children,
    data,
  }: {
    children: ReactNode
    data?: unknown[]
  }) => (
    <svg data-testid="bar-chart" data-points={String(data?.length ?? 0)}>
      {children}
    </svg>
  ),
  Bar: ({ dataKey }: { dataKey: string }) => <g data-testid={`bar-${dataKey}`} />,
  CartesianGrid: () => <g data-testid="cartesian-grid" />,
  XAxis: () => <g data-testid="x-axis" />,
}))

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="chart-skeleton" className={className} />
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

const data: BookingsChartPoint[] = [
  { date: "2026-01-05", count: 2 },
  { date: "2026-01-12", count: 4 },
]

describe("BookingsBarChart", () => {
  it("renders the bookings chart heading, description, and data container", () => {
    render(<BookingsBarChart loading={false} data={data} filter={filter} />)

    expect(screen.getByText("Bookings per week")).toBeInTheDocument()
    expect(screen.getByText("Weekly totals · This month")).toBeInTheDocument()
    expect(screen.getByTestId("chart-container")).toBeInTheDocument()
    expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-points", "2")
    expect(screen.getByTestId("bar-count")).toBeInTheDocument()
  })

  it("shows a loading skeleton instead of the chart on the first load", () => {
    render(<BookingsBarChart loading data={[]} filter={filter} />)

    expect(screen.getByTestId("chart-skeleton")).toBeInTheDocument()
    expect(screen.queryByTestId("chart-container")).not.toBeInTheDocument()
  })

  it("keeps the chart mounted while refreshing when previous data exists", () => {
    render(<BookingsBarChart loading data={data} filter={filter} />)

    expect(screen.getByTestId("chart-container")).toBeInTheDocument()
    expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-points", "2")
    expect(screen.queryByTestId("chart-skeleton")).not.toBeInTheDocument()
  })
})
