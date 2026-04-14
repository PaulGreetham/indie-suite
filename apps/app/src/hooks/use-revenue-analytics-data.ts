"use client"

import * as React from "react"
import { addMonths, format, startOfMonth } from "date-fns"
import { collection, getDocs, query, where } from "firebase/firestore"

import { useAuth } from "@/lib/firebase/auth-context"
import { getFirestoreDb } from "@/lib/firebase/client"
import {
  applySharedDateFilter,
  coerceToDate,
  getFilterDateBounds,
  type SharedDateFilterState,
} from "@/lib/filters/date-time-filter"

export type RevenueChartPoint = {
  date: string
  paid: number
  pipeline: number
}

export type RevenueMetricsData = {
  currency: string
  paid: number
  futureUnpaid: number
  numPaidInvoices: number
  numFutureUnpaidInvoices: number
  numOverdueInvoices: number
  totalOverdueAmount: number
  next4WeeksTotal: number
  next4WeeksCount: number
}

type InvoiceDoc = {
  status?: "draft" | "sent" | "paid" | "overdue" | "void" | "partial"
  issue_date?: string
  payments?: Array<{ amount?: number; due_date?: string; currency?: string }>
}

type PaymentRecord = {
  amount: number
  due?: Date
  status?: string
  invoiceId: string
  currency?: string
}

function buildMonthRange(start: Date, end: Date): Date[] {
  const months: Date[] = []
  let cursor = startOfMonth(start)
  const lastMonth = startOfMonth(end)

  while (cursor <= lastMonth) {
    months.push(cursor)
    cursor = startOfMonth(addMonths(cursor, 1))
  }

  return months
}

export function useRevenueAnalyticsData(filter: SharedDateFilterState) {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [metrics, setMetrics] = React.useState<RevenueMetricsData>({
    currency: "GBP",
    paid: 0,
    futureUnpaid: 0,
    numPaidInvoices: 0,
    numFutureUnpaidInvoices: 0,
    numOverdueInvoices: 0,
    totalOverdueAmount: 0,
    next4WeeksTotal: 0,
    next4WeeksCount: 0,
  })
  const [chartData, setChartData] = React.useState<RevenueChartPoint[]>([])

  React.useEffect(() => {
    let mounted = true

    if (authLoading) return
    if (!user) {
      setLoading(false)
      setMetrics({
        currency: "GBP",
        paid: 0,
        futureUnpaid: 0,
        numPaidInvoices: 0,
        numFutureUnpaidInvoices: 0,
        numOverdueInvoices: 0,
        totalOverdueAmount: 0,
        next4WeeksTotal: 0,
        next4WeeksCount: 0,
      })
      setChartData([])
      return
    }

    setLoading(true)
    setError(null)

    const run = async () => {
      const db = getFirestoreDb()
      const invoiceSnap = await getDocs(
        query(collection(db, "invoices"), where("ownerId", "==", user.uid))
      )
      const now = new Date()
      const fourWeeksFromNow = new Date(now)
      fourWeeksFromNow.setDate(fourWeeksFromNow.getDate() + 28)

      let currency: string | undefined
      const payments: PaymentRecord[] = []

      invoiceSnap.forEach((doc) => {
        const inv = doc.data() as InvoiceDoc
        const rows = Array.isArray(inv.payments) ? inv.payments : []

        rows.forEach((payment) => {
          const due =
            coerceToDate(payment.due_date) ?? coerceToDate(inv.issue_date)

          payments.push({
            amount: Number(payment.amount || 0),
            due,
            status: inv.status,
            invoiceId: doc.id,
            currency: payment.currency,
          })

          if (!currency && payment.currency) {
            currency = payment.currency
          }
        })
      })

      const filteredPayments = applySharedDateFilter(
        payments,
        filter,
        (payment) => payment.due
      )

      const paidInvoiceIds = new Set<string>()
      const futureUnpaidInvoiceIds = new Set<string>()
      const overdueInvoiceIds = new Set<string>()

      let paid = 0
      let futureUnpaid = 0
      let totalOverdueAmount = 0
      let next4WeeksTotal = 0
      let next4WeeksCount = 0

      filteredPayments.forEach((payment) => {
        const due = payment.due
        if (payment.status === "paid") {
          paid += payment.amount
          paidInvoiceIds.add(payment.invoiceId)
        }

        if (
          due &&
          due > now &&
          payment.status !== "paid" &&
          payment.status !== "void"
        ) {
          futureUnpaid += payment.amount
          futureUnpaidInvoiceIds.add(payment.invoiceId)
        }

        if (
          due &&
          due < now &&
          payment.status !== "paid" &&
          payment.status !== "void"
        ) {
          totalOverdueAmount += payment.amount
          overdueInvoiceIds.add(payment.invoiceId)
        }

        if (
          due &&
          due >= now &&
          due <= fourWeeksFromNow &&
          payment.status !== "paid" &&
          payment.status !== "void"
        ) {
          next4WeeksTotal += payment.amount
          next4WeeksCount += 1
        }
      })

      const explicitBounds = getFilterDateBounds(filter)
      const datedPayments = filteredPayments.filter(
        (payment): payment is PaymentRecord & { due: Date } => Boolean(payment.due)
      )
      const fallbackStart =
        datedPayments.length > 0
          ? datedPayments.reduce(
              (min, payment) => (payment.due < min ? payment.due : min),
              datedPayments[0].due
            )
          : new Date()
      const fallbackEnd =
        datedPayments.length > 0
          ? datedPayments.reduce(
              (max, payment) => (payment.due > max ? payment.due : max),
              datedPayments[0].due
            )
          : new Date()
      const monthRange = buildMonthRange(
        explicitBounds.start ?? fallbackStart,
        explicitBounds.end ?? fallbackEnd
      )
      const paidByMonth = new Map<string, number>()
      const pipelineByMonth = new Map<string, number>()

      monthRange.forEach((month) => {
        const key = format(month, "yyyy-MM")
        paidByMonth.set(key, 0)
        pipelineByMonth.set(key, 0)
      })

      datedPayments.forEach((payment) => {
        const key = format(startOfMonth(payment.due), "yyyy-MM")
        if (payment.status === "paid") {
          paidByMonth.set(key, (paidByMonth.get(key) ?? 0) + payment.amount)
        } else if (payment.status !== "void") {
          pipelineByMonth.set(
            key,
            (pipelineByMonth.get(key) ?? 0) + payment.amount
          )
        }
      })

      if (!mounted) return

      setMetrics({
        currency: currency || "GBP",
        paid,
        futureUnpaid,
        numPaidInvoices: paidInvoiceIds.size,
        numFutureUnpaidInvoices: futureUnpaidInvoiceIds.size,
        numOverdueInvoices: overdueInvoiceIds.size,
        totalOverdueAmount,
        next4WeeksTotal,
        next4WeeksCount,
      })
      setChartData(
        monthRange.map((month) => {
          const key = format(month, "yyyy-MM")
          return {
            date: format(month, "yyyy-MM-01"),
            paid: paidByMonth.get(key) ?? 0,
            pipeline: pipelineByMonth.get(key) ?? 0,
          }
        })
      )
    }

    run()
      .catch((err) => {
        if (!mounted) return
        setError(err instanceof Error ? err.message : "Failed to load revenue")
        setMetrics({
          currency: "GBP",
          paid: 0,
          futureUnpaid: 0,
          numPaidInvoices: 0,
          numFutureUnpaidInvoices: 0,
          numOverdueInvoices: 0,
          totalOverdueAmount: 0,
          next4WeeksTotal: 0,
          next4WeeksCount: 0,
        })
        setChartData([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [authLoading, filter, user])

  return { loading, error, metrics, chartData }
}
