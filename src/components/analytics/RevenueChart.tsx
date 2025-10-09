"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { collection, getDocs } from "firebase/firestore"
import { format, startOfMonth, endOfMonth, addMonths, isWithinInterval, parseISO } from "date-fns"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getFirestoreDb } from "@/lib/firebase/client"
import { cn } from "@/lib/utils"
import { Select } from "@/components/ui/select"

type ChartPoint = { date: string; paid: number; pipeline: number }

function buildMonthRange(monthsForward: number): Date[] {
  const now = new Date()
  const start = startOfMonth(now)
  return Array.from({ length: monthsForward }, (_, idx) => startOfMonth(addMonths(start, idx)))
}

async function fetchChartData(months: number): Promise<ChartPoint[]> {
  const db = getFirestoreDb()
  const monthRange = buildMonthRange(months)
  const rangeStart = startOfMonth(monthRange[0])
  const rangeEnd = endOfMonth(monthRange[monthRange.length - 1])

  const invoiceSnap = await getDocs(collection(db, "invoices"))

  const paidByMonth = new Map<string, number>()
  const pipelineByMonth = new Map<string, number>()
  for (const m of monthRange) {
    const key = format(m, "yyyy-MM")
    paidByMonth.set(key, 0)
    pipelineByMonth.set(key, 0)
  }

  invoiceSnap.forEach((d) => {
    const inv = d.data() as { status?: string; payments?: Array<{ amount?: number; due_date?: string }> }
    const payments = Array.isArray(inv.payments) ? inv.payments : []
    for (const p of payments) {
      const amt = Number(p.amount || 0)
      const due = p.due_date ? parseISO(p.due_date) : undefined
      if (!due) continue
      if (isWithinInterval(due, { start: rangeStart, end: rangeEnd })) {
        const key = format(startOfMonth(due), "yyyy-MM")
        if (inv.status === "paid") {
          paidByMonth.set(key, (paidByMonth.get(key) ?? 0) + amt)
        } else if (inv.status !== "void") {
          pipelineByMonth.set(key, (pipelineByMonth.get(key) ?? 0) + amt)
        }
      }
    }
  })

  return monthRange.map((m) => {
    const key = format(m, "yyyy-MM")
    return {
      date: format(m, "yyyy-MM-01"),
      paid: paidByMonth.get(key) ?? 0,
      pipeline: pipelineByMonth.get(key) ?? 0,
    }
  })
}

const chartConfig = {
  paid: { label: "Paid revenue", color: "hsl(var(--chart-1))" },
  pipeline: { label: "Pipeline revenue", color: "hsl(142 70% 45%)" },
} satisfies ChartConfig

export function RevenueChart({ className }: { className?: string }) {
  const [data, setData] = React.useState<ChartPoint[] | null>(null)
  const [timeRange, setTimeRange] = React.useState<string>("6m")
  const [key, setKey] = React.useState(0)

  React.useEffect(() => {
    const months = timeRange === "3m" ? 3 : timeRange === "12m" ? 12 : 6
    fetchChartData(months).then((d) => {
      setData(d)
      setKey((k) => k + 1) // remount to trigger animation on range change
    })
  }, [timeRange])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="grid gap-1">
            <CardTitle>Total Revenue</CardTitle>
            <CardDescription>Next {timeRange.replace("m", " months")} · paid, pipeline</CardDescription>
          </div>
          <Select
            options={[
              { value: "3m", label: "Next 3 months" },
              { value: "6m", label: "Next 6 months" },
              { value: "12m", label: "Next 12 months" },
            ]}
            value={timeRange}
            onChange={setTimeRange}
            className="w-[160px]"
          />
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {data === null ? (
          <div className={cn("h-[335px] w-full", className)} />
        ) : (
        <ChartContainer config={chartConfig} className={cn("aspect-auto h-[335px] w-full overflow-visible", className)}>
          <AreaChart key={key} accessibilityLayer data={data} margin={{ top: 16, bottom: 20, left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => new Date(value).toLocaleDateString("en-US", { month: "short" })}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
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
            <Area dataKey="paid" type="natural" fill="url(#fillPaid)" fillOpacity={0.4} stroke="var(--color-paid)" stackId="a" isAnimationActive animationDuration={600} />
            <Area dataKey="pipeline" type="natural" fill="url(#fillPipeline)" fillOpacity={0.4} stroke="var(--color-pipeline)" stackId="a" isAnimationActive animationDuration={600} />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}


