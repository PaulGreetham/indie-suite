"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getFirestoreDb } from "@/lib/firebase/client"
import { collection, getDocs } from "firebase/firestore"
import { startOfYear, endOfYear, isWithinInterval, parseISO, addDays } from "date-fns"

type InvoiceDoc = {
  status?: "draft" | "sent" | "paid" | "overdue" | "void" | "partial"
  issue_date?: string // YYYY-MM-DD
  payments?: Array<{ amount?: number; due_date?: string; currency?: string }>
}

function formatCurrency(amount: number, currency = "GBP") {
  try {
    const isInt = Number.isInteger(amount)
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: isInt ? 0 : 2,
      maximumFractionDigits: isInt ? 0 : 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

async function loadMetrics(): Promise<{
  totalPaidThisYear: number
  totalFutureUnpaid: number
  currency: string
  numPaidInvoices: number
  numFutureUnpaidInvoices: number
  numOverdueInvoices: number
  totalOverdueAmount: number
  next4WeeksTotal: number
  next4WeeksCount: number
}> {
  const db = getFirestoreDb()
  const now = new Date()
  const yStart = startOfYear(now)
  const yEnd = endOfYear(now)

  // Invoices - fetch all and filter client-side (nested arrays prevent simple Firestore queries)
  const invSnap = await getDocs(collection(db, "invoices"))

  let currency: string | undefined
  let totalPaidThisYear = 0
  let totalFutureUnpaid = 0
  const paidInvoiceIds = new Set<string>()
  const futureUnpaidInvoiceIds = new Set<string>()

  let numOverdueInvoices = 0
  let totalOverdueAmount = 0
  const fourWeeksFromNow = addDays(now, 28)
  let next4WeeksTotal = 0
  let next4WeeksCount = 0
  invSnap.forEach((d) => {
    const inv = d.data() as InvoiceDoc
    const payments = Array.isArray(inv.payments) ? inv.payments : []
    if (inv.status === "overdue") {
      numOverdueInvoices += 1
    }
    for (const p of payments) {
      const amt = Number(p.amount || 0)
      if (!currency && p.currency) currency = p.currency
      const due = p.due_date ? parseISO(p.due_date) : undefined
      // Paid this year: invoice marked paid AND payment due date within this calendar year (fallback to issue_date)
      const issue = inv.issue_date ? parseISO(inv.issue_date) : undefined
      const inYear = isWithinInterval(due || issue || new Date(0), { start: yStart, end: yEnd })
      if (inv.status === "paid" && inYear) {
        totalPaidThisYear += amt
        paidInvoiceIds.add(d.id)
      }
      // Future unpaid: due date in the future and invoice not paid/void
      if (due && due > now && inv.status !== "paid" && inv.status !== "void") {
        totalFutureUnpaid += amt
        futureUnpaidInvoiceIds.add(d.id)
      }
      // Overdue revenue: due date in the past and not paid/void
      if (due && due < now && inv.status !== "paid" && inv.status !== "void") {
        totalOverdueAmount += amt
      }
      // Due in next 4 weeks (from today)
      if (due && due >= now && due <= fourWeeksFromNow && inv.status !== "paid" && inv.status !== "void") {
        next4WeeksTotal += amt
        next4WeeksCount += 1
      }
    }
  })

  return {
    totalPaidThisYear,
    totalFutureUnpaid,
    currency: currency || "GBP",
    numPaidInvoices: paidInvoiceIds.size,
    numFutureUnpaidInvoices: futureUnpaidInvoiceIds.size,
    numOverdueInvoices,
    totalOverdueAmount,
    next4WeeksTotal,
    next4WeeksCount,
  }
}

export function DashboardMetrics() {
  const [loading, setLoading] = React.useState(true)
  const [currency, setCurrency] = React.useState("GBP")
  const [paid, setPaid] = React.useState(0)
  const [futureUnpaid, setFutureUnpaid] = React.useState(0)
  // bookings metric removed
  const [error, setError] = React.useState<string | null>(null)
  const [numPaidInvoices, setNumPaidInvoices] = React.useState(0)
  const [numFutureUnpaidInvoices, setNumFutureUnpaidInvoices] = React.useState(0)
  const [numOverdueInvoices, setNumOverdueInvoices] = React.useState(0)
  const [totalOverdueAmount, setTotalOverdueAmount] = React.useState(0)
  const [next4WeeksTotal, setNext4WeeksTotal] = React.useState(0)
  const [next4WeeksCount, setNext4WeeksCount] = React.useState(0)

  React.useEffect(() => {
    let mounted = true
    loadMetrics()
      .then((m) => {
        if (!mounted) return
        setPaid(m.totalPaidThisYear)
        setFutureUnpaid(m.totalFutureUnpaid)
        setCurrency(m.currency)
        setNumPaidInvoices(m.numPaidInvoices)
        setNumFutureUnpaidInvoices(m.numFutureUnpaidInvoices)
        setNumOverdueInvoices(m.numOverdueInvoices)
        setTotalOverdueAmount(m.totalOverdueAmount)
        setNext4WeeksTotal(m.next4WeeksTotal)
        setNext4WeeksCount(m.next4WeeksCount)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load metrics"))
      .finally(() => setLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <Card className="gap-0 py-4">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium">Total paid this year</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="text-3xl font-semibold">
            {loading ? "--" : formatCurrency(paid, currency)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {loading ? "" : `${numPaidInvoices} paid invoice${numPaidInvoices === 1 ? "" : "s"} in ${new Date().getFullYear()}`}
          </div>
          {error ? <div className="text-xs text-red-500 mt-1">{error}</div> : null}
        </CardContent>
      </Card>

      <Card className="gap-0 py-4">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium">Pipeline revenue</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="text-3xl font-semibold">
            {loading ? "--" : formatCurrency(futureUnpaid, currency)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {loading ? "" : `${numFutureUnpaidInvoices} outstanding invoice${numFutureUnpaidInvoices === 1 ? "" : "s"}`}
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-4">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium">Due in next 4 weeks</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="text-3xl font-semibold">{loading ? "--" : formatCurrency(next4WeeksTotal, currency)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {loading ? "" : `${next4WeeksCount} invoice${next4WeeksCount === 1 ? "" : "s"}`}
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-4">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium">Overdue invoices</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="text-3xl font-semibold">{loading ? "--" : formatCurrency(totalOverdueAmount, currency)}</div>
          <div className="text-xs text-muted-foreground mt-1">{loading ? "" : `${numOverdueInvoices} overdue invoice${numOverdueInvoices === 1 ? "" : "s"}`}</div>
        </CardContent>
      </Card>
    </div>
  )
}


