"use client"

import * as React from "react"
import { Bar, BarChart, XAxis, YAxis, LabelList, CartesianGrid, Cell } from "recharts"
import { collection, getDoc, getDocs, query, where, doc } from "firebase/firestore"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getFirestoreDb } from "@/lib/firebase/client"
import { useAuth } from "@/lib/firebase/auth-context"

type Row = { customerId: string; name: string; bookings: number }

const chartConfig: ChartConfig = {
  // Use shadcn blue for bars; label uses background for good contrast
  bookings: { label: "Bookings", color: "var(--chart-2)" },
  label: { color: "var(--background)" },
} as const

export function OverviewTopCustomers() {
  const { user, loading: authLoading } = useAuth()
  const [rows, setRows] = React.useState<Row[]>([])
  const SHADES = [
    "hsl(217 91% 60%)",
    "hsl(217 88% 57%)",
    "hsl(217 84% 54%)",
    "hsl(217 80% 50%)",
    "hsl(217 74% 46%)",
    "hsl(217 68% 42%)",
    "hsl(217 62% 38%)",
  ]

  React.useEffect(() => {
    if (authLoading || !user) return
    const run = async () => {
      const db = getFirestoreDb()
      const snap = await getDocs(query(collection(db, "events"), where("ownerId", "==", user.uid)))
      const counts = new Map<string, number>()
      const customerIds = new Set<string>()
      snap.forEach((d) => {
        const v = d.data() as { customerId?: string }
        const cid = typeof v.customerId === "string" ? v.customerId : ""
        if (!cid) return
        customerIds.add(cid)
        counts.set(cid, (counts.get(cid) ?? 0) + 1)
      })
      // Fetch names for customers present
      const entries: Row[] = []
      await Promise.all(
        Array.from(customerIds).map(async (cid) => {
          const snap = await getDoc(doc(db, "customers", cid))
          const name = snap.exists()
            ? ((snap.data() as { company?: string; fullName?: string }).company || (snap.data() as { company?: string; fullName?: string }).fullName || "—")
            : "—"
          entries.push({ customerId: cid, name, bookings: counts.get(cid) ?? 0 })
        })
      )
      entries.sort((a, b) => b.bookings - a.bookings)
      setRows(entries.slice(0, 7))
    }
    run().catch(() => setRows([]))
  }, [authLoading, user])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Most bookings by customer</CardTitle>
        <CardDescription>Top customers</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <ChartContainer config={chartConfig} className="aspect-auto h-[240px]">
          <BarChart accessibilityLayer data={rows} layout="vertical" margin={{ left: 0, right: 16 }} barCategoryGap="10%">
            <CartesianGrid horizontal={false} />
            <YAxis dataKey="name" type="category" tickLine={false} tickMargin={10} axisLine={false} hide />
            <XAxis dataKey="bookings" type="number" hide />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Bar dataKey="bookings" layout="vertical" radius={6} isAnimationActive animationDuration={600} animationEasing="ease-out">
              {rows.map((_, i) => (
                <Cell key={`c-${i}`} fill={SHADES[i % SHADES.length]} />
              ))}
              <LabelList dataKey="name" position="insideLeft" offset={8} className="fill-(--color-label)" fontSize={12} />
              <LabelList dataKey="bookings" position="right" offset={8} className="fill-foreground" fontSize={12} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}


