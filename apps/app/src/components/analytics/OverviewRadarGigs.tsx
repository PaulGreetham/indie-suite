"use client"

import * as React from "react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"
import { collection, getDocs, query, where } from "firebase/firestore"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getFirestoreDb } from "@/lib/firebase/client"
import { useAuth } from "@/lib/firebase/auth-context"
import {
  applySharedDateFilter,
  coerceToDate,
  type SharedDateFilterState,
} from "@/lib/filters/date-time-filter"

type Point = { month: string; gigs: number }

const chartConfig: ChartConfig = {
  // Use the exact app primary yellow to match revenue charts
  gigs: { label: "Gigs", color: "#fcf300" },
} as const

const MONTHS_DEC_FIRST: string[] = [
  "Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sept","Oct","Nov",
]

type OverviewRadarGigsProps = {
  filter: SharedDateFilterState
}

type EventRecord = {
  startsAt?: unknown
}

export function OverviewRadarGigs({ filter }: OverviewRadarGigsProps) {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = React.useState<Point[]>([])

  React.useEffect(() => {
    if (authLoading || !user) return
    const db = getFirestoreDb()
    const months = MONTHS_DEC_FIRST

    const run = async () => {
      const c = new Map<string, number>(months.map((m) => [m, 0]))
      const snap = await getDocs(query(collection(db, "events"), where("ownerId", "==", user.uid)))
      const filteredEvents = applySharedDateFilter(
        snap.docs.map((doc) => doc.data() as EventRecord),
        filter,
        (event) => coerceToDate(event.startsAt)
      )

      filteredEvents.forEach((event) => {
        const date = coerceToDate(event.startsAt)
        if (!date) return
        const key = date.toLocaleDateString("en-GB", { month: "short" })
        const mapped = key === "Sep" ? "Sept" : key
        if (!c.has(mapped)) return
        c.set(mapped, (c.get(mapped) ?? 0) + 1)
      })
      setData(months.map((m) => ({ month: m, gigs: c.get(m) ?? 0 })))
    }
    run().catch(() => setData(months.map((m) => ({ month: m, gigs: 0 }))))
  }, [authLoading, filter, user])

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
    </Card>
  )
}


