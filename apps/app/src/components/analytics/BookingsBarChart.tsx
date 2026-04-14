"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { addDays, format, startOfWeek } from "date-fns"
import { collection, getDocs, query, where } from "firebase/firestore"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getFirestoreDb } from "@/lib/firebase/client"
import { useAuth } from "@/lib/firebase/auth-context"
import {
  applySharedDateFilter,
  coerceToDate,
  getActiveFilterLabel,
  getFilterDateBounds,
  type SharedDateFilterState,
} from "@/lib/filters/date-time-filter"

type Point = { date: string; count: number }
type EventRecord = { startsAt?: string | { toDate?: () => Date } }

const chartConfig = {
  // Use the exact app primary yellow
  count: { label: "Bookings", color: "#fcf300" },
} satisfies ChartConfig

type BookingsBarChartProps = {
  filter: SharedDateFilterState
}

export function BookingsBarChart({ filter }: BookingsBarChartProps) {
  const [data, setData] = React.useState<Point[]>([])
  const { user, loading: authLoading } = useAuth()

  React.useEffect(() => {
    if (authLoading || !user) { setData([]); return }
    const run = async () => {
      const db = getFirestoreDb()
      const snap = await getDocs(query(collection(db, "events"), where("ownerId", "==", user.uid)))
      const filteredEvents = applySharedDateFilter(
        snap.docs.map((doc) => doc.data() as EventRecord),
        filter,
        (event) => coerceToDate(event.startsAt)
      )
      const counts = new Map<string, number>()
      const explicitBounds = getFilterDateBounds(filter)
      const fallbackStart =
        filteredEvents.length > 0
          ? filteredEvents.reduce((min, event) => {
              const date = coerceToDate(event.startsAt)!
              return date < min ? date : min
            }, coerceToDate(filteredEvents[0].startsAt)!)
          : new Date()
      const fallbackEnd =
        filteredEvents.length > 0
          ? filteredEvents.reduce((max, event) => {
              const date = coerceToDate(event.startsAt)!
              return date > max ? date : max
            }, coerceToDate(filteredEvents[0].startsAt)!)
          : new Date()
      const start = startOfWeek(explicitBounds.start ?? fallbackStart, { weekStartsOn: 1 })
      const end = startOfWeek(explicitBounds.end ?? fallbackEnd, { weekStartsOn: 1 })

      filteredEvents.forEach((ev) => {
        const dt = coerceToDate(ev.startsAt)
        if (!dt) return
        // Use week start (Monday) as the bucket key to avoid year-week boundary bugs
        const key = format(startOfWeek(dt, { weekStartsOn: 1 }), "yyyy-MM-dd")
        counts.set(key, (counts.get(key) ?? 0) + 1)
      })

      // Build weekly buckets across the window
      const out: Point[] = []
      let iter = new Date(start)
      while (iter <= end) {
        const weekKey = format(iter, "yyyy-MM-dd")
        out.push({ date: weekKey, count: counts.get(weekKey) ?? 0 })
        iter = addDays(iter, 7)
      }
      setData(out)
    }
    run().catch(() => setData([]))
  }, [authLoading, filter, user])

  return (
    <Card className="py-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Bookings per week</CardTitle>
          <CardDescription>Weekly totals · {getActiveFilterLabel(filter)}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
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
      </CardContent>
    </Card>
  )
}


