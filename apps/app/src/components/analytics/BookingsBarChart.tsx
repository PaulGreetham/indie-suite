"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import type { BookingsChartPoint } from "../../hooks/use-bookings-analytics-data"
import {
  getActiveFilterLabel,
  type SharedDateFilterState,
} from "@/lib/filters/date-time-filter"

const chartConfig = {
  // Use the exact app primary yellow
  count: { label: "Bookings", color: "#fcf300" },
} satisfies ChartConfig

type BookingsBarChartProps = {
  loading: boolean
  data: BookingsChartPoint[]
  filter: SharedDateFilterState
}

export function BookingsBarChart({
  loading,
  data,
  filter,
}: BookingsBarChartProps) {
  return (
    <Card className="py-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b px-5 py-5 sm:flex-row sm:px-6">
        <div className="grid flex-1 gap-1">
          <CardTitle>Bookings per week</CardTitle>
          <CardDescription>Weekly totals · {getActiveFilterLabel(filter)}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-5 sm:px-6 sm:py-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[335px] w-full overflow-visible">
          <BarChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                />
              }
            />
            <Bar dataKey="count" fill="var(--color-count)" />
          </BarChart>
        </ChartContainer>
      <CardContent className="px-2 sm:p-6">
        {loading ? (
          <Skeleton className="h-[335px] w-full bg-muted/60 dark:bg-muted/40" />
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[335px] w-full overflow-visible">
            <BarChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value: string) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[150px]"
                    labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  />
                }
              />
              <Bar dataKey="count" fill="var(--color-count)" isAnimationActive animationDuration={1200} animationEasing="ease-in-out" />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
