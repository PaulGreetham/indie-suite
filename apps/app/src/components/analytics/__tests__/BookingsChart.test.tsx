import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const {
  getDocsMock,
  collectionMock,
  getFirestoreDbMock,
} = vi.hoisted(() => ({
  getDocsMock: vi.fn(),
  collectionMock: vi.fn(),
  getFirestoreDbMock: vi.fn(),
}))

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
}))

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onChange,
    options,
    className,
  }: {
    value?: string
    onChange?: (value: string) => void
    options: Array<{ value: string; label: string }>
    className?: string
  }) => (
    <select
      aria-label="Time range"
      className={className}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

vi.mock("@/lib/firebase/client", () => ({
  getFirestoreDb: getFirestoreDbMock,
}))

vi.mock("firebase/firestore", () => ({
  collection: collectionMock,
  getDocs: getDocsMock,
}))

import { BookingsChart } from "../BookingsChart"

function futureIsoDate(daysFromNow: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString()
}

function createInvoiceSnapshot(records: Array<{ status?: string; payments?: Array<{ amount?: number; due_date?: string }> }>) {
  return {
    forEach(callback: (doc: { data: () => typeof records[number] }) => void) {
      records.forEach((record) => {
        callback({
          data: () => record,
        })
      })
    },
  }
}

describe("BookingsChart", () => {
  beforeEach(() => {
    getFirestoreDbMock.mockReturnValue({ id: "db" })
    collectionMock.mockReturnValue({ id: "invoices" })
    getDocsMock.mockResolvedValue(
      createInvoiceSnapshot([
        {
          status: "paid",
          payments: [{ amount: 1500, due_date: futureIsoDate(5) }],
        },
        {
          status: "sent",
          payments: [{ amount: 700, due_date: futureIsoDate(40) }],
        },
      ])
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("loads and renders the default future revenue range", async () => {
    render(<BookingsChart />)

    expect(screen.getByText("Total Revenue")).toBeInTheDocument()
    expect(screen.getByText("Next 6 months · paid, pipeline")).toBeInTheDocument()

    await waitFor(() => expect(screen.getByTestId("chart-container")).toBeInTheDocument())

    expect(screen.getByTestId("area-chart")).toHaveAttribute("data-points", "6")
    expect(screen.getByText("Range: 6m")).toBeInTheDocument()
    expect(getDocsMock).toHaveBeenCalledTimes(1)
  })

  it("reloads the chart when the selected time range changes", async () => {
    render(<BookingsChart />)

    await waitFor(() => expect(screen.getByTestId("chart-container")).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText("Time range"), {
      target: { value: "3m" },
    })

    await waitFor(() =>
      expect(screen.getByText("Next 3 months · paid, pipeline")).toBeInTheDocument()
    )

    await waitFor(() => expect(getDocsMock).toHaveBeenCalledTimes(2))
    expect(screen.getByText("Range: 3m")).toBeInTheDocument()
  })

  it("shows an error message when the chart data request fails", async () => {
    getDocsMock.mockRejectedValueOnce(new Error("Firestore unavailable"))

    render(<BookingsChart />)

    await waitFor(() =>
      expect(screen.getByText("Firestore unavailable")).toBeInTheDocument()
    )

    expect(screen.queryByTestId("chart-container")).not.toBeInTheDocument()
  })
})
