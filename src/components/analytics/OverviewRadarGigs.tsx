"use client"

import * as React from "react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"
import { collection, getDocs, query, where } from "firebase/firestore"
import { startOfYear, endOfYear, isWithinInterval, addMonths } from "date-fns"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getFirestoreDb } from "@/lib/firebase/client"
import { useAuth } from "@/lib/firebase/auth-context"
import { Switch } from "@/components/ui/switch"

type Point = { month: string; gigs: number }

const chartConfig: ChartConfig = {
  // Use the exact app primary yellow to match revenue charts
  gigs: { label: "Gigs", color: "#fcf300" },
} as const

function buildMonthsForYear(base: Date): string[] {
  const start = startOfYear(base)
  return Array.from({ length: 12 }, (_, i) => {
    const d = addMonths(start, i)
    return d.toLocaleDateString("en-GB", { month: "short" })
  })
}

export function OverviewRadarGigs() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = React.useState<Point[]>([])
  const [range, setRange] = React.useState<"year" | "ytd">("year")
  const year = new Date().getFullYear()

  React.useEffect(() => {
    if (authLoading || !user) return
    const run = async () => {
      const db = getFirestoreDb()
      const now = new Date()
      const yStart = startOfYear(now)
      const yEnd = range === "year" ? endOfYear(now) : now

      const months = buildMonthsForYear(now)
      const counts = new Map<string, number>(months.map((m) => [m, 0]))

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
          typeof (v.startsAt as { toDate?: () => Date }).toDate === "function"
        ) {
          try {
            date = (v.startsAt as { toDate: () => Date }).toDate()
          } catch {}
        }
        if (!date) return
        if (!isWithinInterval(date, { start: yStart, end: yEnd })) return
        const key = date.toLocaleDateString("en-GB", { month: "short" })
        counts.set(key, (counts.get(key) ?? 0) + 1)
      })

      setData(months.map((m) => ({ month: m, gigs: counts.get(m) ?? 0 })))
    }
    run().catch(() => setData([]))
  }, [authLoading, user, range])

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle>Gigs per month</CardTitle>
          <div className="text-xs text-muted-foreground">{range === "ytd" ? "YTD" : year}</div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[320px]">
          <RadarChart data={data}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="month" />
            <PolarGrid />
            <Radar dataKey="gigs" stroke="var(--color-gigs)" fill="var(--color-gigs)" fillOpacity={0.6} dot={{ r: 4, fillOpacity: 1 }} />
          </RadarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="justify-center pt-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{year}</span>
          <Switch checked={range === "ytd"} onCheckedChange={(v) => setRange(v ? "ytd" : "year")} />
          <span>YTD</span>
        </div>
      </CardFooter>
    </Card>
  )
}


