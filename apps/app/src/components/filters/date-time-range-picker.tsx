"use client"

import * as React from "react"
import { CalendarIcon, ChevronDownIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select } from "@/components/ui/select"
import {
  type DateTimeRangeValue,
  getDateTimeFilterLabel,
  withDefaultDateTimeRange,
} from "@/lib/filters/date-time-filter"

type DateTimeRangePickerProps = {
  value: DateTimeRangeValue
  onChange: (value: DateTimeRangeValue) => void
}

const modeOptions = [
  { value: "single", label: "Single day" },
  { value: "range", label: "Range" },
] as const

export function DateTimeRangePicker({
  value,
  onChange,
}: DateTimeRangePickerProps) {
  const normalizedValue = React.useMemo(
    () => withDefaultDateTimeRange(value),
    [value]
  )

  const handleModeChange = (nextMode: string) => {
    const mode = nextMode === "single" ? "single" : "range"

    onChange({
      ...normalizedValue,
      mode,
      to: mode === "single" ? normalizedValue.from : normalizedValue.to,
    })
  }

  const handleSingleSelect = (date?: Date) => {
    onChange({
      ...normalizedValue,
      from: date,
      to: normalizedValue.mode === "single" ? date : normalizedValue.to,
    })
  }

  const handleRangeSelect = (range?: DateRange) => {
    onChange({
      ...normalizedValue,
      from: range?.from,
      to: range?.to,
    })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-[280px] justify-between gap-2 rounded-xl px-4 text-left"
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{getDateTimeFilterLabel(normalizedValue)}</span>
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-auto min-w-[320px] rounded-2xl border p-0"
      >
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="date-time-range-mode" className="text-xs text-muted-foreground">
              Mode
            </Label>
            <Select
              value={normalizedValue.mode}
              onChange={handleModeChange}
              options={modeOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              className="w-[160px]"
            />
          </div>

          {normalizedValue.mode === "single" ? (
            <Calendar
              mode="single"
              selected={normalizedValue.from}
              onSelect={handleSingleSelect}
              captionLayout="dropdown"
              fromYear={2020}
              toYear={new Date().getFullYear() + 5}
              className="rounded-xl border"
            />
          ) : (
            <Calendar
              mode="range"
              selected={{
                from: normalizedValue.from,
                to: normalizedValue.to,
              }}
              onSelect={handleRangeSelect}
              numberOfMonths={2}
              captionLayout="dropdown"
              fromYear={2020}
              toYear={new Date().getFullYear() + 5}
              className="rounded-xl border"
            />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date-time-range-start" className="text-xs text-muted-foreground">
                Start
              </Label>
              <Input
                id="date-time-range-start"
                type="time"
                value={normalizedValue.fromTime}
                onChange={(event) =>
                  onChange({
                    ...normalizedValue,
                    fromTime: event.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-time-range-end" className="text-xs text-muted-foreground">
                End
              </Label>
              <Input
                id="date-time-range-end"
                type="time"
                value={normalizedValue.toTime}
                onChange={(event) =>
                  onChange({
                    ...normalizedValue,
                    toTime: event.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
