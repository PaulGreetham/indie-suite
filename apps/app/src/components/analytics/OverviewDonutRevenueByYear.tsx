"use client"

import * as React from "react"
import { Label, Pie, PieChart } from "recharts"
import { collection, getDocs, query, where } from "firebase/firestore"
import { startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getFirestoreDb } from "@/lib/firebase/client"
import { useAuth } from "@/lib/firebase/auth-context"
import { Select } from "@/components/ui/select"

type StatusKey = "draft" | "sent" | "paid" | "partial" | "overdue" | "void"

type ChartSlice = { status: StatusKey; amount: number; fill: string }

const chartConfig: ChartConfig = {
  paid: { label: "Paid", color: "hsl(142 70% 40%)" },
  sent: { label: "Open", color: "hsl(142 58% 60%)" },
  partial: { label: "Partial", color: "hsl(142 60% 48%)" },
  overdue: { label: "Overdue", color: "hsl(0 75% 60%)" },
  draft: { label: "Draft", color: "hsl(0 0% 55%)" },
  void: { label: "Void", color: "hsl(0 0% 40%)" },
}

export function OverviewDonutRevenueByYear() {
  const { user, loading: authLoading } = useAuth()
  const [slices, setSlices] = React.useState<ChartSlice[]>([])
  const [total, setTotal] = React.useState(0)
  const [year, setYear] = React.useState<number>(new Date().getFullYear())
  const [years, setYears] = React.useState<number[]>([])

  // Determine available years from invoices (from when the user started)
  React.useEffect(() => {
    if (authLoading || !user) return
    const run = async () => {
      const db = getFirestoreDb()
      const snap = await getDocs(query(collection(db, "invoices"), where("ownerId", "==", user.uid)))
      const yearsSet = new Set<number>()
      snap.forEach((d) => {
        const inv = d.data() as { issue_date?: string; payments?: { due_date?: string }[] }
        const iso = inv.issue_date || inv.payments?.[0]?.due_date
        const dt = iso ? parseISO(iso) : null
        if (dt) yearsSet.add(dt.getFullYear())
      })
      const sorted = Array.from(yearsSet).sort((a, b) => a - b)
      setYears(sorted.length ? sorted : [new Date().getFullYear()])
      if (sorted.length && !sorted.includes(year)) setYear(sorted[sorted.length - 1])
    }
    run().catch(() => setYears([new Date().getFullYear()]))
  }, [authLoading, user])

  React.useEffect(() => {
    if (authLoading || !user) return
    const run = async () => {
      const db = getFirestoreDb()
      const snap = await getDocs(query(collection(db, "invoices"), where("ownerId", "==", user.uid)))
      const yStart = startOfYear(new Date(year, 0, 1))
      const yEnd = endOfYear(new Date(year, 11, 31))
      const byStatus = new Map<StatusKey, number>([
        ["paid", 0],
        ["sent", 0],
        ["draft", 0],
        ["overdue", 0],
        ["partial", 0],
        ["void", 0],
      ])
      let totalAmt = 0
      snap.forEach((d) => {
        const inv = d.data() as { status?: StatusKey; payments?: { amount?: number; due_date?: string }[]; issue_date?: string }
        const payments = Array.isArray(inv.payments) ? inv.payments : []
        const status: StatusKey = (inv.status as StatusKey) || "draft"
        for (const p of payments) {
          const amt = Number(p.amount || 0)
          const due = p.due_date ? parseISO(p.due_date) : undefined
          const issue = inv.issue_date ? parseISO(inv.issue_date) : undefined
          const inYear = isWithinInterval(due || issue || new Date(0), { start: yStart, end: yEnd })
          if (!inYear) continue
          totalAmt += amt
          byStatus.set(status, (byStatus.get(status) ?? 0) + amt)
        }
      })
      setTotal(totalAmt)
      const out: ChartSlice[] = Array.from(byStatus.entries()).map(([status, amount]) => ({
        status,
        amount,
        fill: `var(--color-${status})`,
      }))
      setSlices(out)
    }
    run().catch(() => { setSlices([]); setTotal(0) })
  }, [authLoading, user, year])

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-0">
        <CardTitle>Revenue by status</CardTitle>
        <CardAction>
          <Select
            value={String(year)}
            onChange={(v) => setYear(Number(v))}
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
            placeholder="Year"
            className="w-[92px]"
          />
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[320px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie data={slices} dataKey="amount" nameKey="status" innerRadius={"63%"} outerRadius={"93%"} strokeWidth={5}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                          £{total.toLocaleString("en-GB")}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
                          Total revenue
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}


