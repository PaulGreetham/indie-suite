import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AnalyticsPageHeader } from "../AnalyticsPageHeader"
import type {
  DateTimeRangeValue,
  FilterMode,
  TimeRangeOption,
} from "@/lib/filters/date-time-filter"

vi.mock("@/components/filters/date-time-filter", () => ({
  DateTimeFilter: ({
    onTimeRangeChange,
    onDateTimeRangeChange,
    onFilterModeChange,
  }: {
    onTimeRangeChange: (value: string) => void
    onDateTimeRangeChange: (value: DateTimeRangeValue) => void
    onFilterModeChange: (mode: FilterMode) => void
  }) => (
    <div data-testid="date-time-filter">
      <button type="button" onClick={() => onTimeRangeChange("last-30-days")}>
        Change time range
      </button>
      <button
        type="button"
        onClick={() =>
          onDateTimeRangeChange({
            mode: "single",
            from: new Date("2026-02-01T00:00:00.000Z"),
            to: new Date("2026-02-01T00:00:00.000Z"),
            fromTime: "09:00",
            toTime: "17:00",
          })
        }
      >
        Change date time
      </button>
      <button type="button" onClick={() => onFilterModeChange("dateTime")}>
        Change filter mode
      </button>
    </div>
  ),
}))

const timeRanges: TimeRangeOption[] = [
  { value: "this-month", label: "This month" },
  { value: "last-30-days", label: "Last 30 days" },
]

describe("AnalyticsPageHeader", () => {
  it("renders the page title and passes through filter callbacks", () => {
    const onTimeRangeChange = vi.fn()
    const onDateTimeRangeChange = vi.fn()
    const onFilterModeChange = vi.fn()

    render(
      <AnalyticsPageHeader
        title="Revenue analytics"
        timeRanges={timeRanges}
        timeRange="this-month"
        onTimeRangeChange={onTimeRangeChange}
        dateTimeRange={{ mode: "range" }}
        onDateTimeRangeChange={onDateTimeRangeChange}
        filterMode="preset"
        onFilterModeChange={onFilterModeChange}
      />
    )

    expect(
      screen.getByRole("heading", { name: "Revenue analytics" })
    ).toBeInTheDocument()
    expect(screen.getByTestId("date-time-filter")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Change time range" }))
    fireEvent.click(screen.getByRole("button", { name: "Change date time" }))
    fireEvent.click(screen.getByRole("button", { name: "Change filter mode" }))

    expect(onTimeRangeChange).toHaveBeenCalledWith("last-30-days")
    expect(onDateTimeRangeChange).toHaveBeenCalledWith({
      mode: "single",
      from: new Date("2026-02-01T00:00:00.000Z"),
      to: new Date("2026-02-01T00:00:00.000Z"),
      fromTime: "09:00",
      toTime: "17:00",
    })
    expect(onFilterModeChange).toHaveBeenCalledWith("dateTime")
  })
})
