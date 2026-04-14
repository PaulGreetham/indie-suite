import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { RevenueChart } from "../RevenueChart"
import type { SharedDateFilterState } from "@/lib/filters/date-time-filter"
import type { RevenueChartPoint } from "@/hooks/use-revenue-analytics-data"

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
  ChartLegend: ({ content }: { content?: ReactNode }) => (
    <div data-testid="chart-legend">{content}</div>
  ),
  ChartLegendContent: () => <div data-testid="chart-legend-content" />,
}))

vi.mock("recharts", () => ({
  AreaChart: ({
    children,
    data,
  }: {
    children: ReactNode
    data?: unknown[]
  }) => (
    <svg data-testid="area-chart" data-points={String(data?.length ?? 0)}>
      {children}
    </svg>
  ),
  Area: ({ dataKey }: { dataKey: string }) => <g data-testid={`area-${dataKey}`} />,
  CartesianGrid: () => <g data-testid="cartesian-grid" />,
  XAxis: () => <g data-testid="x-axis" />,
  YAxis: () => <g data-testid="y-axis" />,
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

const data: RevenueChartPoint[] = [
  { date: "2026-01-01", paid: 1200, pipeline: 800 },
  { date: "2026-02-01", paid: 900, pipeline: 1100 },
]

describe("RevenueChart", () => {
  it("renders the analytics chart heading, description, and data container", () => {
    render(<RevenueChart loading={false} data={data} filter={filter} />)

    expect(screen.getByText("Total Revenue")).toBeInTheDocument()
    expect(screen.getByText("This month · paid, pipeline")).toBeInTheDocument()
    expect(screen.getByTestId("chart-container")).toBeInTheDocument()
    expect(screen.getByTestId("area-chart")).toHaveAttribute("data-points", "2")
    expect(screen.getByTestId("area-paid")).toBeInTheDocument()
    expect(screen.getByTestId("area-pipeline")).toBeInTheDocument()
  })

  it("shows a loading skeleton instead of the chart while data is loading", () => {
    render(<RevenueChart loading data={[]} filter={filter} />)

    expect(screen.getByTestId("chart-skeleton")).toBeInTheDocument()
    expect(screen.queryByTestId("chart-container")).not.toBeInTheDocument()
  })

  it("keeps the chart mounted while refreshing when previous data exists", () => {
    render(<RevenueChart loading data={data} filter={filter} />)

    expect(screen.getByTestId("chart-container")).toBeInTheDocument()
    expect(screen.getByTestId("area-chart")).toHaveAttribute("data-points", "2")
    expect(screen.queryByTestId("chart-skeleton")).not.toBeInTheDocument()
  })
})
