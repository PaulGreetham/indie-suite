"use client"

import * as React from "react"
import { addDays, format, startOfWeek } from "date-fns"
import { collection, getDocs, query, where } from "firebase/firestore"

import { useAuth } from "@/lib/firebase/auth-context"
import { getFirestoreDb } from "@/lib/firebase/client"
import {
  applySharedDateFilter,
  coerceToDate,
  getFilterDateBounds,
  type SharedDateFilterState,
} from "@/lib/filters/date-time-filter"

export type BookingsChartPoint = {
  date: string
  count: number
}

export type BookingsMetricsData = {
  totalInRange: number
  upcoming: number
  next4Weeks: number
  completed: number
}

type EventRecord = {
  startsAt?: string | { toDate?: () => Date }
}

export function useBookingsAnalyticsData(filter: SharedDateFilterState) {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [metrics, setMetrics] = React.useState<BookingsMetricsData>({
    totalInRange: 0,
    upcoming: 0,
    next4Weeks: 0,
    completed: 0,
  })
  const [chartData, setChartData] = React.useState<BookingsChartPoint[]>([])

  React.useEffect(() => {
    let mounted = true

    if (authLoading) return
    if (!user) {
      setLoading(false)
      setMetrics({
        totalInRange: 0,
        upcoming: 0,
        next4Weeks: 0,
        completed: 0,
      })
      setChartData([])
      return
    }

    setLoading(true)
    setError(null)

    const run = async () => {
      const db = getFirestoreDb()
      const snap = await getDocs(
        query(collection(db, "events"), where("ownerId", "==", user.uid))
      )
      const now = new Date()
      const fourWeeks = new Date(now)
      fourWeeks.setDate(fourWeeks.getDate() + 28)

      const filteredEvents = applySharedDateFilter(
        snap.docs.map((doc) => doc.data() as EventRecord),
        filter,
        (event) => coerceToDate(event.startsAt)
      )
      const datedEvents = filteredEvents
        .map((event) => coerceToDate(event.startsAt))
        .filter((date): date is Date => Boolean(date))

      let totalInRange = 0
      let upcoming = 0
      let next4Weeks = 0
      let completed = 0

      datedEvents.forEach((date) => {
        totalInRange += 1
        if (date >= now) upcoming += 1
        if (date >= now && date <= fourWeeks) next4Weeks += 1
        if (date < now) completed += 1
      })

      const explicitBounds = getFilterDateBounds(filter)
      const fallbackStart =
        datedEvents.length > 0
          ? datedEvents.reduce(
              (min, date) => (date < min ? date : min),
              datedEvents[0]
            )
          : new Date()
      const fallbackEnd =
        datedEvents.length > 0
          ? datedEvents.reduce(
              (max, date) => (date > max ? date : max),
              datedEvents[0]
            )
          : new Date()
      const start = startOfWeek(explicitBounds.start ?? fallbackStart, {
        weekStartsOn: 1,
      })
      const end = startOfWeek(explicitBounds.end ?? fallbackEnd, {
        weekStartsOn: 1,
      })
      const counts = new Map<string, number>()

      datedEvents.forEach((date) => {
        const key = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd")
        counts.set(key, (counts.get(key) ?? 0) + 1)
      })

      const points: BookingsChartPoint[] = []
      let iter = new Date(start)
      while (iter <= end) {
        const weekKey = format(iter, "yyyy-MM-dd")
        points.push({ date: weekKey, count: counts.get(weekKey) ?? 0 })
        iter = addDays(iter, 7)
      }

      if (!mounted) return

      setMetrics({
        totalInRange,
        upcoming,
        next4Weeks,
        completed,
      })
      setChartData(points)
    }

    run()
      .catch((err) => {
        if (!mounted) return
        setError(err instanceof Error ? err.message : "Failed to load bookings")
        setMetrics({
          totalInRange: 0,
          upcoming: 0,
          next4Weeks: 0,
          completed: 0,
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
