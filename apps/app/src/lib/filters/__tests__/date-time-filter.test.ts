import { describe, expect, it } from "vitest"

import {
  applyDateTimeRangeFilter,
  applySharedDateFilter,
  applyTimeRangeFilter,
  coerceToDate,
  getActiveFilterLabel,
  getAnalyticsTimeRanges,
  getDateTimeFilterLabel,
  getFilterDateBounds,
  withDefaultDateTimeRange,
  type SharedDateFilterState,
  type TimeRangeOption,
} from "../date-time-filter"

const sampleItems = [
  { id: "before", date: "2026-01-04T23:59:00.000Z" },
  { id: "start", date: "2026-01-05T00:00:00.000Z" },
  { id: "middle", date: "2026-01-10T12:00:00.000Z" },
  { id: "end", date: "2026-01-15T23:59:00.000Z" },
  { id: "after", date: "2026-01-16T00:00:00.000Z" },
]

const timeRanges: TimeRangeOption[] = [
  {
    value: "custom-range",
    label: "Custom range",
    start: "2026-01-05T00:00:00.000Z",
    end: "2026-01-15T23:59:00.000Z",
  },
  { value: "all", label: "All time" },
]

describe("date-time-filter utilities", () => {
  it("coerces dates from supported input shapes", () => {
    const directDate = new Date("2026-02-01T12:00:00.000Z")
    const timestampLike = {
      toDate: () => new Date("2026-03-01T09:30:00.000Z"),
    }

    expect(coerceToDate(directDate)).toEqual(directDate)
    expect(coerceToDate("2026-02-15T10:00:00.000Z")).toEqual(
      new Date("2026-02-15T10:00:00.000Z")
    )
    expect(coerceToDate(timestampLike)).toEqual(
      new Date("2026-03-01T09:30:00.000Z")
    )
    expect(coerceToDate({ toDate: () => new Date("invalid") })).toBeUndefined()
    expect(coerceToDate({ toDate: () => {
      throw new Error("boom")
    } })).toBeUndefined()
  })

  it("filters data by preset time range boundaries", () => {
    const result = applyTimeRangeFilter(
      sampleItems,
      "custom-range",
      timeRanges,
      (item) => new Date(item.date)
    )

    expect(result.map((item) => item.id)).toEqual(["start", "middle", "end"])
    expect(
      applyTimeRangeFilter(sampleItems, "all", timeRanges, (item) => new Date(item.date))
    ).toEqual(sampleItems)
  })

  it("filters data by date time range and shared filter mode", () => {
    const rangeFilter = {
      mode: "range" as const,
      from: new Date("2026-01-10T00:00:00.000Z"),
      to: new Date("2026-01-10T23:59:00.000Z"),
      fromTime: "12:00",
      toTime: "18:00",
    }

    const directRangeResult = applyDateTimeRangeFilter(
      sampleItems,
      rangeFilter,
      (item) => new Date(item.date)
    )

    const sharedFilter: SharedDateFilterState = {
      filterMode: "dateTime",
      timeRange: "custom-range",
      timeRanges,
      dateTimeRange: rangeFilter,
    }

    const sharedResult = applySharedDateFilter(
      sampleItems,
      sharedFilter,
      (item) => new Date(item.date)
    )

    expect(directRangeResult.map((item) => item.id)).toEqual(["middle"])
    expect(sharedResult.map((item) => item.id)).toEqual(["middle"])
  })

  it("returns bounds and labels for preset and custom filters", () => {
    const presetFilter: SharedDateFilterState = {
      filterMode: "preset",
      timeRange: "custom-range",
      timeRanges,
      dateTimeRange: { mode: "range" },
    }

    const customFilter: SharedDateFilterState = {
      filterMode: "dateTime",
      timeRange: "all",
      timeRanges,
      dateTimeRange: {
        mode: "single",
        from: new Date(2026, 0, 10, 12, 0),
        fromTime: "09:00",
        toTime: "17:00",
      },
    }

    expect(getFilterDateBounds(presetFilter)).toEqual({
      start: new Date("2026-01-05T00:00:00.000Z"),
      end: new Date("2026-01-15T23:59:00.000Z"),
    })
    expect(getActiveFilterLabel(presetFilter)).toBe("Custom range")
    expect(getActiveFilterLabel(customFilter)).toBe("Jan 10, 2026 09:00-17:00")
    expect(getDateTimeFilterLabel({ mode: "range" })).toBe("Pick date & time")
  })

  it("fills default date time values and builds deterministic analytics ranges", () => {
    const withDefaults = withDefaultDateTimeRange({
      from: new Date(2026, 5, 15, 10, 0),
    })
    const ranges = getAnalyticsTimeRanges(new Date("2026-06-15T12:00:00.000Z"))
    const nextYear = ranges.find((range) => range.value === "next-year")

    expect(withDefaults).toEqual({
      mode: "range",
      from: new Date(2026, 5, 15, 10, 0),
      to: undefined,
      fromTime: "00:00",
      toTime: "23:59",
    })

    expect(ranges[0]).toMatchObject({
      value: "all",
      label: "All time",
    })
    expect(ranges.find((range) => range.value === "last-30-days")).toMatchObject({
      label: "Last 30 days",
      group: "Past",
      start: "2026-05-17T12:00:00.000Z",
      end: "2026-06-15T12:00:00.000Z",
    })
    expect(nextYear).toMatchObject({
      label: "Next year",
      group: "Forecast",
    })
    expect(new Date(nextYear!.start!).getFullYear()).toBe(2027)
    expect(new Date(nextYear!.start!).getMonth()).toBe(0)
    expect(new Date(nextYear!.start!).getDate()).toBe(1)
    expect(new Date(nextYear!.end!).getFullYear()).toBe(2027)
    expect(new Date(nextYear!.end!).getMonth()).toBe(11)
    expect(new Date(nextYear!.end!).getDate()).toBe(31)
  })
})
