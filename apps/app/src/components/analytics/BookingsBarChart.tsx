"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { addDays, addMonths, endOfMonth, format, isWithinInterval, parseISO, startOfMonth, startOfWeek } from "date-fns"
import { collection, getDocs, query, where } from "firebase/firestore"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select } from "@/components/ui/select"
import { getFirestoreDb } from "@/lib/firebase/client"
import { useAuth } from "@/lib/firebase/auth-context"

type Point = { date: string; count: number }

const chartConfig = {
  // Use the exact app primary yellow
  count: { label: "Bookings", color: "#fcf300" },
} satisfies ChartConfig

export function BookingsBarChart() {
  const [range, setRange] = React.useState("6m")
  const [data, setData] = React.useState<Point[]>([])
  const { user, loading: authLoading } = useAuth()

  React.useEffect(() => {
    const months = range === "3m" ? 3 : range === "12m" ? 12 : 6
    const now = new Date()
    const monthRange = Array.from({ length: months }, (_, i) => startOfMonth(addMonths(now, i)))
    const start = startOfWeek(monthRange[0], { weekStartsOn: 1 })
    const end = endOfMonth(monthRange[monthRange.length - 1])

    if (authLoading || !user) { setData([]); return }
    const run = async () => {
      const db = getFirestoreDb()
      const snap = await getDocs(query(collection(db, "events"), where("ownerId", "==", user.uid)))
      const counts = new Map<string, number>()

      snap.forEach((d) => {
        const ev = d.data() as { startsAt?: string }
        if (!ev.startsAt) return
        const dt = parseISO(ev.startsAt)
        if (!isWithinInterval(dt, { start, end })) return
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
  }, [range, authLoading, user])

  return (
    <Card className="py-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Bookings per week</CardTitle>
          <CardDescription>Weekly totals · future {range.replace("m", " months")}</CardDescription>
        </div>
        <Select
          options={[
            { value: "3m", label: "Next 3 months" },
            { value: "6m", label: "Next 6 months" },
            { value: "12m", label: "Next 12 months" },
          ]}
          value={range}
          onChange={setRange}
          className="w-[160px]"
        />
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


