"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { collection, getDocs, orderBy, query, where } from "firebase/firestore"
import { format, startOfMonth, endOfMonth, addMonths, isWithinInterval, parseISO } from "date-fns"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getFirestoreDb } from "@/lib/firebase/client"
import { cn } from "@/lib/utils"
import { Select } from "@/components/ui/select"

type ChartPoint = { date: string; paid: number; pipeline: number; overdue: number }

// Build range of future months for 3/6/12 months starting this month
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

  const q = query(
    collection(db, "events"),
    where("startsAt", ">=", rangeStart.toISOString()),
    where("startsAt", "<=", rangeEnd.toISOString()),
    orderBy("startsAt", "asc")
  )

  const [eventSnap, invoiceSnap] = await Promise.all([
    getDocs(q),
    getDocs(collection(db, "invoices")),
  ])

  const paidByMonth = new Map<string, number>()
  const pipelineByMonth = new Map<string, number>()
  // We surface overdue as a single "current outstanding" value at the latest x-value
  let totalOverdueOutstanding = 0
  for (const m of monthRange) {
    const key = format(m, "yyyy-MM")
    paidByMonth.set(key, 0)
    pipelineByMonth.set(key, 0)
  }

  // We no longer plot bookings count here; chart focuses on revenue streams

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

        // Track global overdue outstanding regardless of chart month bucket
        if (due < new Date() && inv.status !== "paid" && inv.status !== "void") {
          totalOverdueOutstanding += amt
        }
      }
    }
  })

  return monthRange.map((m, idx) => {
    const key = format(m, "yyyy-MM")
    const isLast = idx === monthRange.length - 1
    return {
      date: format(m, "yyyy-MM-01"),
      paid: paidByMonth.get(key) ?? 0,
      pipeline: pipelineByMonth.get(key) ?? 0,
      // Show current total overdue as the last value; 0 elsewhere for clarity
      overdue: isLast ? totalOverdueOutstanding : 0,
    }
  })
}

const chartConfig = {
  paid: { label: "Paid revenue", color: "hsl(var(--chart-1))" },
  pipeline: { label: "Pipeline revenue", color: "hsl(142 70% 45%)" },
  overdue: { label: "Overdue revenue", color: "hsl(0 84% 60%)" },
} satisfies ChartConfig

export function BookingsChart({ className }: { className?: string }) {
  const [data, setData] = React.useState<ChartPoint[] | null>(null)
  // Future window selector: 3 / 6 / 12 months ahead
  const [timeRange, setTimeRange] = React.useState<string>("6m")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const months = timeRange === "3m" ? 3 : timeRange === "12m" ? 12 : 6
    setData(null)
    fetchChartData(months)
      .then((d) => setData(d))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load bookings"))
  }, [timeRange])

  const chartData = React.useMemo(() => {
    return data ?? []
  }, [data])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="grid gap-1">
            <CardTitle>Total Revenue</CardTitle>
            <CardDescription>Next {timeRange.replace("m", " months")} · paid, pipeline, overdue</CardDescription>
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
        {error ? (
          <div className="text-sm text-red-500">{error}</div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className={cn("aspect-auto h-[250px] w-full overflow-hidden", className)}
          >
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 8, bottom: 8, left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value: string) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", { month: "short" })
                }}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <defs>
                <linearGradient id="fillPaid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-paid)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-paid)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillPipeline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-pipeline)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-pipeline)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillOverdue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-overdue)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-overdue)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <Area dataKey="paid" type="natural" fill="url(#fillPaid)" fillOpacity={0.25} stroke="var(--color-paid)" strokeWidth={2} isAnimationActive animationDuration={600} />
              <Area dataKey="pipeline" type="natural" fill="url(#fillPipeline)" fillOpacity={0.3} stroke="var(--color-pipeline)" strokeWidth={2} isAnimationActive animationDuration={600} />
              <Area dataKey="overdue" type="natural" fill="url(#fillOverdue)" fillOpacity={0.2} stroke="var(--color-overdue)" strokeWidth={2} isAnimationActive animationDuration={600} />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              Trending up <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              Range: {timeRange}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}


