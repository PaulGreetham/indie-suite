"use client"

import * as React from "react"
import { Pie, PieChart } from "recharts"
import { collection, getDocs, query, where } from "firebase/firestore"
import { startOfYear, endOfYear, isWithinInterval } from "date-fns"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getFirestoreDb } from "@/lib/firebase/client"
import { useAuth } from "@/lib/firebase/auth-context"

type Slice = { weekday: string; count: number; fill: string }

// Full day names with varying coral shades
const WEEKDAYS: { key: string; label: string; color: string }[] = [
  { key: "mon", label: "Monday", color: "hsl(16 100% 76%)" },
  { key: "tue", label: "Tuesday", color: "hsl(16 95% 68%)" },
  { key: "wed", label: "Wednesday", color: "hsl(16 90% 62%)" },
  { key: "thu", label: "Thursday", color: "hsl(16 85% 56%)" },
  { key: "fri", label: "Friday", color: "hsl(16 80% 50%)" },
  { key: "sat", label: "Saturday", color: "hsl(16 74% 46%)" },
  { key: "sun", label: "Sunday", color: "hsl(16 68% 42%)" },
]

const chartConfig: ChartConfig = WEEKDAYS.reduce((acc, w) => {
  acc[w.key] = { label: w.label, color: w.color }
  return acc
}, {} as ChartConfig)

export function OverviewPieWeekdayBookings() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = React.useState<Slice[]>([])

  React.useEffect(() => {
    if (authLoading || !user) return
    const run = async () => {
      const db = getFirestoreDb()
      const now = new Date()
      const yStart = startOfYear(now)
      const yEnd = endOfYear(now)
      const counts: Record<string, number> = {
        mon: 0,
        tue: 0,
        wed: 0,
        thu: 0,
        fri: 0,
        sat: 0,
        sun: 0,
      }
      const snap = await getDocs(query(collection(db, "events"), where("ownerId", "==", user.uid)))
      snap.forEach((d) => {
        const v = d.data() as { startsAt?: unknown }
        let date: Date | null = null
        if (typeof v.startsAt === "string") {
          const parsed = new Date(v.startsAt)
          if (!Number.isNaN(parsed.getTime())) date = parsed
        } else if (
          v.startsAt &&
          typeof v.startsAt === "object" &&
          // narrow Firestore Timestamp-like object
          typeof (v.startsAt as { toDate?: () => Date }).toDate === "function"
        ) {
          try {
            date = (v.startsAt as { toDate: () => Date }).toDate()
          } catch {}
        }
        if (!date) return
        if (!isWithinInterval(date, { start: yStart, end: yEnd })) return
        // JS getDay: 0=Sun..6=Sat. Map to Mon-first keys
        const day = date.getDay()
        const key = day === 0 ? "sun" : (WEEKDAYS[day - 1].key)
        counts[key] += 1
      })

      setData(
        WEEKDAYS.map((w) => ({ weekday: w.key, count: counts[w.key], fill: `var(--color-${w.key})` }))
      )
    }
    run().catch(() => setData([]))
  }, [authLoading, user])

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Bookings by weekday</CardTitle>
        <CardDescription>{new Date().getFullYear()}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[320px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie data={data} dataKey="count" nameKey="weekday" />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}


