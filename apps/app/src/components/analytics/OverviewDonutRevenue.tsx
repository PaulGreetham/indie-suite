"use client"

import * as React from "react"
import { Label, Pie, PieChart } from "recharts"
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

type OverviewDonutRevenueProps = {
  filter: SharedDateFilterState
}

type InvoicePayment = {
  amount?: number
  due_date?: string
  currency?: string
}

type InvoiceRecord = {
  status?: StatusKey
  payments?: InvoicePayment[]
  issue_date?: string
}

export function OverviewDonutRevenue({ filter }: OverviewDonutRevenueProps) {
  const { user, loading: authLoading } = useAuth()
  const [slices, setSlices] = React.useState<ChartSlice[]>([])
  const [total, setTotal] = React.useState(0)

  React.useEffect(() => {
    if (authLoading || !user) return
    const run = async () => {
      const db = getFirestoreDb()
      const snap = await getDocs(query(collection(db, "invoices"), where("ownerId", "==", user.uid)))
      const byStatus = new Map<StatusKey, number>([
        ["sent", 0],
        ["draft", 0],
        ["overdue", 0],
        ["partial", 0],
        ["void", 0],
        ["paid", 0],
      ])
      let totalAmt = 0
      snap.forEach((d) => {
        const inv = d.data() as InvoiceRecord
        const payments = Array.isArray(inv.payments) ? inv.payments : []
        const status: StatusKey = (inv.status as StatusKey) || "draft"
        const filteredPayments = applySharedDateFilter(payments, filter, (payment) => {
          return coerceToDate(payment.due_date) ?? coerceToDate(inv.issue_date)
        })

        for (const p of filteredPayments) {
          const amt = Number(p.amount || 0)
          if (status !== "paid") {
            totalAmt += amt
            byStatus.set(status, (byStatus.get(status) ?? 0) + amt)
          }
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
  }, [authLoading, filter, user])

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-0">
        <CardTitle>Outstanding revenue by status</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[320px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={slices}
              dataKey="amount"
              nameKey="status"
              innerRadius={"63%"}
              outerRadius={"93%"}
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
                          Total outstanding
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


