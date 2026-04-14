"use client"

import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  type DateTimeRangeValue,
  type FilterMode,
  type TimeRangeOption,
} from "@/lib/filters/date-time-filter"

import { DateTimeRangePicker } from "./date-time-range-picker"

export type DateTimeFilterProps = {
  timeRanges: TimeRangeOption[]
  timeRange: string
  onTimeRangeChange: (value: string) => void
  dateTimeRange: DateTimeRangeValue
  onDateTimeRangeChange: (value: DateTimeRangeValue) => void
  filterMode: FilterMode
  onFilterModeChange: (mode: FilterMode) => void
}

export function DateTimeFilter({
  timeRanges,
  timeRange,
  onTimeRangeChange,
  dateTimeRange,
  onDateTimeRangeChange,
  filterMode,
  onFilterModeChange,
}: DateTimeFilterProps) {
  const isCustomMode = filterMode === "dateTime"

  return (
    <div className="ml-auto flex shrink-0 items-center justify-end gap-3">
      <div className="flex shrink-0 items-center gap-3">
        <Switch
          id="dashboard-date-filter-toggle"
          checked={isCustomMode}
          onCheckedChange={(checked) =>
            onFilterModeChange(checked ? "dateTime" : "preset")
          }
        />
        <Label
          htmlFor="dashboard-date-filter-toggle"
          className="text-sm font-medium text-muted-foreground"
        >
          Toggle Date Filter
        </Label>
      </div>

      {isCustomMode ? (
        <DateTimeRangePicker
          value={dateTimeRange}
          onChange={onDateTimeRangeChange}
        />
      ) : (
        <Select
          value={timeRange}
          onChange={onTimeRangeChange}
          options={timeRanges.map((option) => ({
            value: option.value,
            label: option.label,
            group: option.group,
          }))}
          className="h-11 w-[280px] rounded-xl"
        />
      )}
    </div>
  )
}
