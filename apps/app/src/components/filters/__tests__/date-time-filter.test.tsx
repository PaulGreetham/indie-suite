import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { DateTimeFilter } from "../date-time-filter"
import type {
  DateTimeRangeValue,
  TimeRangeOption,
} from "@/lib/filters/date-time-filter"

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onChange,
    options,
  }: {
    value?: string
    onChange?: (value: string) => void
    options: Array<{ value: string; label: string }>
  }) => (
    <select
      aria-label="Preset range"
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

vi.mock("@/components/filters/date-time-range-picker", () => ({
  DateTimeRangePicker: ({
    value,
    onChange,
  }: {
    value: DateTimeRangeValue
    onChange: (value: DateTimeRangeValue) => void
  }) => (
    <button
      type="button"
      onClick={() =>
        onChange({
          ...value,
          mode: "single",
          from: new Date("2026-03-01T00:00:00.000Z"),
          to: new Date("2026-03-01T00:00:00.000Z"),
          fromTime: "10:00",
          toTime: "18:00",
        })
      }
    >
      Mock Date Time Picker
    </button>
  ),
}))

const timeRanges: TimeRangeOption[] = [
  { value: "this-month", label: "This month" },
  { value: "last-30-days", label: "Last 30 days" },
]

describe("DateTimeFilter", () => {
  it("renders preset mode and forwards preset range changes", () => {
    const onTimeRangeChange = vi.fn()
    const onDateTimeRangeChange = vi.fn()
    const onFilterModeChange = vi.fn()

    render(
      <DateTimeFilter
        timeRanges={timeRanges}
        timeRange="this-month"
        onTimeRangeChange={onTimeRangeChange}
        dateTimeRange={{ mode: "range" }}
        onDateTimeRangeChange={onDateTimeRangeChange}
        filterMode="preset"
        onFilterModeChange={onFilterModeChange}
      />
    )

    expect(screen.getByText("Toggle Date Filter")).toBeInTheDocument()
    expect(screen.getByLabelText("Preset range")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Mock Date Time Picker" })
    ).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Preset range"), {
      target: { value: "last-30-days" },
    })

    expect(onTimeRangeChange).toHaveBeenCalledWith("last-30-days")
    expect(onDateTimeRangeChange).not.toHaveBeenCalled()
  })

  it("switches to custom mode and forwards picker changes", () => {
    const onTimeRangeChange = vi.fn()
    const onDateTimeRangeChange = vi.fn()
    const onFilterModeChange = vi.fn()

    render(
      <DateTimeFilter
        timeRanges={timeRanges}
        timeRange="this-month"
        onTimeRangeChange={onTimeRangeChange}
        dateTimeRange={{ mode: "range" }}
        onDateTimeRangeChange={onDateTimeRangeChange}
        filterMode="dateTime"
        onFilterModeChange={onFilterModeChange}
      />
    )

    expect(
      screen.queryByLabelText("Preset range")
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Mock Date Time Picker" })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("switch"))
    fireEvent.click(screen.getByRole("button", { name: "Mock Date Time Picker" }))

    expect(onFilterModeChange).toHaveBeenCalledWith("preset")
    expect(onDateTimeRangeChange).toHaveBeenCalledWith({
      mode: "single",
      from: new Date("2026-03-01T00:00:00.000Z"),
      to: new Date("2026-03-01T00:00:00.000Z"),
      fromTime: "10:00",
      toTime: "18:00",
    })
    expect(onTimeRangeChange).not.toHaveBeenCalled()
  })
})
