import {
  addDays,
  addYears,
  endOfMonth,
  endOfYear,
  format,
  isAfter,
  isBefore,
  isValid,
  parseISO,
  startOfDay,
  startOfTomorrow,
  startOfMonth,
  startOfYear,
  subDays,
  subYears,
} from "date-fns"

export type DateTimeRangeValue = {
  mode: "single" | "range"
  from?: Date
  to?: Date
  fromTime?: string
  toTime?: string
}

export type TimeRangeOption = {
  value: string
  label: string
  group?: string
  start?: string
  end?: string
}

export type FilterMode = "preset" | "dateTime"

export type Datum = {
  date: string
  [key: string]: unknown
}

export type SharedDateFilterState = {
  timeRanges: TimeRangeOption[]
  timeRange: string
  dateTimeRange: DateTimeRangeValue
  filterMode: FilterMode
}

type DateAccessor<T> = (item: T) => Date | undefined

const DEFAULT_FROM_TIME = "00:00"
const DEFAULT_TO_TIME = "23:59"

function parseTimeParts(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part))
  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  }
}

function withTime(date: Date, time: string) {
  const next = new Date(date)
  const { hours, minutes } = parseTimeParts(time)
  next.setHours(hours, minutes, 0, 0)
  return next
}

function parseBoundaryDate(value?: string) {
  if (!value) return undefined
  const parsed = parseISO(value)
  if (isValid(parsed)) return parsed
  const fallback = new Date(value)
  return isValid(fallback) ? fallback : undefined
}

function defaultDateAccessor<T>(item: T) {
  if (
    typeof item === "object" &&
    item !== null &&
    "date" in item &&
    typeof (item as Datum).date === "string"
  ) {
    return parseBoundaryDate((item as Datum).date)
  }

  return undefined
}

export function coerceToDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return isValid(value) ? value : undefined
  }

  if (typeof value === "string") {
    return parseBoundaryDate(value)
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    try {
      const date = (value as { toDate: () => Date }).toDate()
      return isValid(date) ? date : undefined
    } catch {
      return undefined
    }
  }

  return undefined
}

export function applyTimeRangeFilter<T>(
  data: T[],
  timeRange: string,
  timeRanges: TimeRangeOption[],
  getDate: DateAccessor<T> = defaultDateAccessor
) {
  const selectedRange = timeRanges.find((option) => option.value === timeRange)

  if (!selectedRange || selectedRange.value === "all") {
    return data
  }

  const start = parseBoundaryDate(selectedRange.start)
  const end = parseBoundaryDate(selectedRange.end)

  if (!start && !end) {
    return data
  }

  return data.filter((item) => {
    const date = getDate(item)
    if (!date) return false
    if (start && isBefore(date, start)) return false
    if (end && isAfter(date, end)) return false
    return true
  })
}

export function applyDateTimeRangeFilter<T>(
  data: T[],
  range: DateTimeRangeValue,
  getDate: DateAccessor<T> = defaultDateAccessor
) {
  if (!range.from) {
    return data
  }

  const fromTime = range.fromTime || DEFAULT_FROM_TIME
  const toTime = range.toTime || DEFAULT_TO_TIME
  const start = withTime(range.from, fromTime)
  const endDate = range.mode === "range" ? range.to ?? range.from : range.from
  const end = withTime(endDate, toTime)

  return data.filter((item) => {
    const date = getDate(item)
    if (!date) return false
    if (isBefore(date, start)) return false
    if (isAfter(date, end)) return false
    return true
  })
}

export function applySharedDateFilter<T>(
  data: T[],
  filter: SharedDateFilterState,
  getDate: DateAccessor<T> = defaultDateAccessor
) {
  if (filter.filterMode === "dateTime") {
    return applyDateTimeRangeFilter(data, filter.dateTimeRange, getDate)
  }

  return applyTimeRangeFilter(data, filter.timeRange, filter.timeRanges, getDate)
}

export function getDateTimeFilterLabel(range: DateTimeRangeValue) {
  if (!range.from) {
    return "Pick date & time"
  }

  const fromTime = range.fromTime || DEFAULT_FROM_TIME
  const toTime = range.toTime || DEFAULT_TO_TIME

  if (range.mode === "single") {
    return `${format(range.from, "MMM d, yyyy")} ${fromTime}-${toTime}`
  }

  const endDate = range.to ?? range.from
  return `${format(range.from, "MMM d, yyyy")} ${fromTime} - ${format(endDate, "MMM d, yyyy")} ${toTime}`
}

export function withDefaultDateTimeRange(
  range?: Partial<DateTimeRangeValue>
): DateTimeRangeValue {
  return {
    mode: range?.mode ?? "range",
    from: range?.from,
    to: range?.to,
    fromTime: range?.fromTime || DEFAULT_FROM_TIME,
    toTime: range?.toTime || DEFAULT_TO_TIME,
  }
}

export function getOverviewTimeRanges(now = new Date()): TimeRangeOption[] {
  const lastYear = subYears(now, 1)
  const tomorrow = startOfTomorrow()
  const today = startOfDay(now)
  const thisMonthEnd = endOfMonth(now)
  const thisYearEnd = endOfYear(now)
  const nextYear = addYears(now, 1)

  return [
    { value: "all", label: "All time", group: "All time" },
    {
      value: "last-30-days",
      label: "Last 30 days",
      group: "Past",
      start: subDays(now, 29).toISOString(),
      end: now.toISOString(),
    },
    {
      value: "last-90-days",
      label: "Last 90 days",
      group: "Past",
      start: subDays(now, 89).toISOString(),
      end: now.toISOString(),
    },
    {
      value: "this-month",
      label: "This month",
      group: "Past",
      start: startOfMonth(now).toISOString(),
      end: endOfMonth(now).toISOString(),
    },
    {
      value: "this-year",
      label: "This year",
      group: "Past",
      start: startOfYear(now).toISOString(),
      end: endOfYear(now).toISOString(),
    },
    {
      value: "last-year",
      label: "Last year",
      group: "Past",
      start: startOfYear(lastYear).toISOString(),
      end: endOfYear(lastYear).toISOString(),
    },
    {
      value: "next-30-days",
      label: "Next 30 days",
      group: "Forecast",
      start: tomorrow.toISOString(),
      end: addDays(tomorrow, 29).toISOString(),
    },
    {
      value: "next-90-days",
      label: "Next 90 days",
      group: "Forecast",
      start: tomorrow.toISOString(),
      end: addDays(tomorrow, 89).toISOString(),
    },
    {
      value: "rest-of-month",
      label: "Rest of this month",
      group: "Forecast",
      start: today.toISOString(),
      end: thisMonthEnd.toISOString(),
    },
    {
      value: "rest-of-year",
      label: "Rest of this year",
      group: "Forecast",
      start: today.toISOString(),
      end: thisYearEnd.toISOString(),
    },
    {
      value: "next-year",
      label: "Next year",
      group: "Forecast",
      start: startOfYear(nextYear).toISOString(),
      end: endOfYear(nextYear).toISOString(),
    },
  ]
}
