"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { collection, getDocs, query, where } from "firebase/firestore"
import { addMonths, format, startOfMonth } from "date-fns"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getFirestoreDb } from "@/lib/firebase/client"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/firebase/auth-context"
import {
  applySharedDateFilter,
  coerceToDate,
  getActiveFilterLabel,
  getFilterDateBounds,
  type SharedDateFilterState,
} from "@/lib/filters/date-time-filter"

type ChartPoint = { date: string; paid: number; pipeline: number }

type PaymentRecord = {
  amount: number
  due: Date
  status?: string
}

type RevenueChartProps = {
  className?: string
  filter: SharedDateFilterState
}

function buildMonthRange(start: Date, end: Date): Date[] {
  const months: Date[] = []
  let cursor = startOfMonth(start)
  const lastMonth = startOfMonth(end)

  while (cursor <= lastMonth) {
    months.push(cursor)
    cursor = startOfMonth(addMonths(cursor, 1))
  }

  return months
}

async function fetchChartData(
  uid: string,
  filter: SharedDateFilterState
): Promise<ChartPoint[]> {
  const db = getFirestoreDb()
  const invoiceSnap = await getDocs(query(collection(db, "invoices"), where("ownerId", "==", uid)))
  const payments: PaymentRecord[] = []

  invoiceSnap.forEach((d) => {
    const inv = d.data() as {
      status?: string
      payments?: Array<{ amount?: number; due_date?: string }>
    }
    const rows = Array.isArray(inv.payments) ? inv.payments : []

    rows.forEach((payment) => {
      const due = coerceToDate(payment.due_date)
      if (!due) return

      payments.push({
        amount: Number(payment.amount || 0),
        due,
        status: inv.status,
      })
    })
  })

  const filteredPayments = applySharedDateFilter(
    payments,
    filter,
    (payment) => payment.due
  )
  const explicitBounds = getFilterDateBounds(filter)
  const fallbackStart =
    filteredPayments.length > 0
      ? filteredPayments.reduce(
          (min, payment) => (payment.due < min ? payment.due : min),
          filteredPayments[0].due
        )
      : new Date()
  const fallbackEnd =
    filteredPayments.length > 0
      ? filteredPayments.reduce(
          (max, payment) => (payment.due > max ? payment.due : max),
          filteredPayments[0].due
        )
      : new Date()
  const monthRange = buildMonthRange(
    explicitBounds.start ?? fallbackStart,
    explicitBounds.end ?? fallbackEnd
  )

  const paidByMonth = new Map<string, number>()
  const pipelineByMonth = new Map<string, number>()
  for (const month of monthRange) {
    const key = format(month, "yyyy-MM")
    paidByMonth.set(key, 0)
    pipelineByMonth.set(key, 0)
  }

  filteredPayments.forEach((payment) => {
    const key = format(startOfMonth(payment.due), "yyyy-MM")
    if (payment.status === "paid") {
      paidByMonth.set(key, (paidByMonth.get(key) ?? 0) + payment.amount)
    } else if (payment.status !== "void") {
      pipelineByMonth.set(key, (pipelineByMonth.get(key) ?? 0) + payment.amount)
    }
  })

  return monthRange.map((month) => {
    const key = format(month, "yyyy-MM")
    return {
      date: format(month, "yyyy-MM-01"),
      paid: paidByMonth.get(key) ?? 0,
      pipeline: pipelineByMonth.get(key) ?? 0,
    }
  })
}

const chartConfig = {
  paid: { label: "Paid revenue ", color: "hsl(var(--chart-1))" },
  pipeline: { label: "Pipeline revenue ", color: "hsl(142 70% 45%)" },
} satisfies ChartConfig

export function RevenueChart({ className, filter }: RevenueChartProps) {
  const [data, setData] = React.useState<ChartPoint[] | null>(null)
  const { user, loading: authLoading } = useAuth()
  const currencySymbol = "£"

  React.useEffect(() => {
    setData(null)
    if (authLoading || !user) return
    fetchChartData(user.uid, filter).then((nextData) => setData(nextData))
  }, [authLoading, filter, user])

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>Total Revenue</CardTitle>
          <CardDescription>{getActiveFilterLabel(filter)} · paid, pipeline</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {data === null ? (
          <div className={cn("h-[335px] w-full", className)} />
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
              <Area dataKey="paid" type="monotone" fill="url(#fillPaid)" fillOpacity={0.4} stroke="var(--color-paid)" stackId="a" isAnimationActive animationDuration={600} />
              <Area dataKey="pipeline" type="monotone" fill="url(#fillPipeline)" fillOpacity={0.4} stroke="var(--color-pipeline)" stackId="a" isAnimationActive animationDuration={600} />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}


