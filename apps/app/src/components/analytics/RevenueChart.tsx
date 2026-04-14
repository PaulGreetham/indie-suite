"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import type { RevenueChartPoint } from "../../hooks/use-revenue-analytics-data"
import { cn } from "@/lib/utils"
import {
  getActiveFilterLabel,
  type SharedDateFilterState,
} from "@/lib/filters/date-time-filter"

type RevenueChartProps = {
  className?: string
  loading: boolean
  data: RevenueChartPoint[]
  filter: SharedDateFilterState
}

const chartConfig = {
  paid: { label: "Paid revenue ", color: "hsl(var(--chart-1))" },
  pipeline: { label: "Pipeline revenue ", color: "hsl(142 70% 45%)" },
} satisfies ChartConfig

export function RevenueChart({
  className,
  loading,
  data,
  filter,
}: RevenueChartProps) {
  const currencySymbol = "£"

  return (
    <Card>
      <CardHeader className="px-5 sm:px-6">
        <div className="grid gap-1">
          <CardTitle>Total Revenue</CardTitle>
          <CardDescription>{getActiveFilterLabel(filter)} · paid, pipeline</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <Skeleton
            className={cn("h-[335px] w-full bg-muted/60 dark:bg-muted/40", className)}
          />
        ) : (
          <ChartContainer config={chartConfig} className={cn("aspect-auto h-[335px] w-full overflow-visible", className)}>
            <AreaChart accessibilityLayer data={data} margin={{ top: 16, bottom: 20, left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <YAxis hide domain={[0, "dataMax"]} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value: string) => new Date(value).toLocaleDateString("en-US", { month: "short" })}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(value) =>
                      new Date(String(value)).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    }
                    formatter={(val, name, item: { payload?: { fill?: string }; color?: string } | null) => {
                      const color = (item?.payload?.fill as string) || (item?.color as string)
                      const labels = chartConfig as Record<string, { label?: React.ReactNode }>
                      return (
                        <div className="flex w-full items-center gap-2">
                          <div
                            className="h-2 w-2 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: color }}
                          />
                          <div className="flex flex-1 items-center justify-between gap-4">
                            <span className="text-muted-foreground">{labels[String(name)]?.label ?? String(name)}</span>
                            <span className="font-mono tabular-nums">{currencySymbol}{Number(val ?? 0).toLocaleString("en-GB", { maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      )
                    }}
                  />
                }
              />
              <defs>
                <linearGradient id="fillPaid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-paid)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-paid)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillPipeline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-pipeline)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-pipeline)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <Area dataKey="paid" type="monotone" fill="url(#fillPaid)" fillOpacity={0.4} stroke="var(--color-paid)" stackId="a" isAnimationActive animationDuration={1200} animationEasing="ease-in-out" />
              <Area dataKey="pipeline" type="monotone" fill="url(#fillPipeline)" fillOpacity={0.4} stroke="var(--color-pipeline)" stackId="a" isAnimationActive animationDuration={1200} animationEasing="ease-in-out" />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}


