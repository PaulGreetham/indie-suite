"use client"

import * as React from "react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"
import { collection, onSnapshot, query, where } from "firebase/firestore"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getFirestoreDb } from "@/lib/firebase/client"
import { useAuth } from "@/lib/firebase/auth-context"
// switch removed

type Point = { month: string; gigs: number }

const chartConfig: ChartConfig = {
  // Use the exact app primary yellow to match revenue charts
  gigs: { label: "Gigs", color: "#fcf300" },
} as const

const MONTHS_DEC_FIRST: string[] = [
  "Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sept","Oct","Nov",
]

export function OverviewRadarGigs() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = React.useState<Point[]>([])

  React.useEffect(() => {
    if (authLoading || !user) return
    const db = getFirestoreDb()
    const months = MONTHS_DEC_FIRST
    // counts map is rebuilt inside snapshot callback

    const unsub = onSnapshot(
      query(collection(db, "events"), where("ownerId", "==", user.uid)),
      (snap) => {
        const c = new Map<string, number>(months.map((m) => [m, 0]))
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
          const key = date.toLocaleDateString("en-GB", { month: "short" })
          const mapped = key === "Sep" ? "Sept" : key // match label spelling
          if (!c.has(mapped)) return
          c.set(mapped, (c.get(mapped) ?? 0) + 1)
        })
        setData(months.map((m) => ({ month: m, gigs: c.get(m) ?? 0 })))
      },
      () => setData(months.map((m) => ({ month: m, gigs: 0 })))
    )

    return () => unsub()
  }, [authLoading, user])

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle>Gigs per month</CardTitle>
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
      {/* Footer switch removed */}
    </Card>
  )
}


