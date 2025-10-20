"use client"

import * as React from "react"
import { Label, Pie, PieChart } from "recharts"
import { collection, getDocs, query, where } from "firebase/firestore"
import { startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getFirestoreDb } from "@/lib/firebase/client"
import { useAuth } from "@/lib/firebase/auth-context"
import { Switch } from "@/components/ui/switch"

type StatusKey = "draft" | "sent" | "paid" | "partial" | "overdue" | "void"

type ChartSlice = { status: StatusKey; amount: number; fill: string }

// Status color palette: greys for draft/void, green shades for open states, light red for overdue
const chartConfig: ChartConfig = {
  paid: { label: "Paid", color: "hsl(142 70% 40%)" },
  sent: { label: "Open", color: "hsl(142 58% 60%)" }, // lighter green
  partial: { label: "Partial", color: "hsl(142 60% 48%)" }, // mid green
  overdue: { label: "Overdue", color: "hsl(0 75% 60%)" }, // light red
  draft: { label: "Draft", color: "hsl(0 0% 55%)" }, // grey
  void: { label: "Void", color: "hsl(0 0% 40%)" },
}

export function OverviewDonutRevenue() {
  const { user, loading: authLoading } = useAuth()
  const [slices, setSlices] = React.useState<ChartSlice[]>([])
  const [total, setTotal] = React.useState(0)
  const [range, setRange] = React.useState<"year" | "ytd">("year")
  const year = new Date().getFullYear()

  React.useEffect(() => {
    if (authLoading || !user) return
    const run = async () => {
      const db = getFirestoreDb()
      const snap = await getDocs(query(collection(db, "invoices"), where("ownerId", "==", user.uid)))
      const now = new Date()
      const yStart = startOfYear(now)
      const yEnd = range === "year" ? endOfYear(now) : now
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
        const inv = d.data() as { status?: StatusKey; payments?: { amount?: number; due_date?: string; currency?: string }[]; issue_date?: string }
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
  }, [authLoading, user, range])

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle>Revenue by status</CardTitle>
          <div className="text-xs text-muted-foreground">{range === "ytd" ? "YTD" : year}</div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[320px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={slices}
              dataKey="amount"
              nameKey="status"
              innerRadius={"55%"}
              outerRadius={"85%"}
              strokeWidth={5}
            >
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


