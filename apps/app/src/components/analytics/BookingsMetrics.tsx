"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NumberTicker } from "@/components/ui/number-ticker"
import { getFirestoreDb } from "@/lib/firebase/client"
import { collection, getDocs, query, where } from "firebase/firestore"
import { useAuth } from "@/lib/firebase/auth-context"
import {
  applySharedDateFilter,
  coerceToDate,
  getActiveFilterLabel,
  type SharedDateFilterState,
} from "@/lib/filters/date-time-filter"

type EventDoc = { startsAt?: string | { toDate?: () => Date } }

type BookingsMetricsProps = {
  filter: SharedDateFilterState
}

export function BookingsMetrics({ filter }: BookingsMetricsProps) {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [totalInRange, setTotalInRange] = React.useState(0)
  const [upcoming, setUpcoming] = React.useState(0)
  const [next4Weeks, setNext4Weeks] = React.useState(0)
  const [completed, setCompleted] = React.useState(0)

  const { user, loading: authLoading } = useAuth()

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      const db = getFirestoreDb()
      const snap = await getDocs(query(collection(db, "events"), where("ownerId", "==", user!.uid)))
      const now = new Date()
      const fourWeeks = new Date(now)
      fourWeeks.setDate(fourWeeks.getDate() + 28)

      let total = 0
      let up = 0
      let n4 = 0
      let comp = 0

      const filteredEvents = applySharedDateFilter(
        snap.docs.map((doc) => doc.data() as EventDoc),
        filter,
        (event) => coerceToDate(event.startsAt)
      )

      filteredEvents.forEach((ev) => {
        const dt = coerceToDate(ev.startsAt)
        if (!dt) return
        total += 1
        if (dt >= now) up += 1
        if (dt >= now && dt <= fourWeeks) n4 += 1
        if (dt < now) comp += 1
      })

      if (!mounted) return
      setTotalInRange(total)
      setUpcoming(up)
      setNext4Weeks(n4)
      setCompleted(comp)
    }
    if (!authLoading && user) {
      setLoading(true)
      load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
    return () => { mounted = false }
  }, [authLoading, filter, user])

  const activeLabel = getActiveFilterLabel(filter)

  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-4">
      <Card className="gap-0 py-3.5">
        <CardHeader className="px-5 pb-1 sm:px-6">
          <CardTitle className="text-sm font-medium">Total bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-5 pt-0 sm:px-6">
          <div className="text-3xl font-semibold leading-none">
            {loading ? "--" : <NumberTicker value={totalInRange} className="inline" />}
          </div>
          <div className="text-xs leading-snug text-muted-foreground">
            {loading ? (
              <span className="invisible">All time</span>
            ) : (
              activeLabel
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-3.5">
        <CardHeader className="px-5 pb-1 sm:px-6">
          <CardTitle className="text-sm font-medium">Upcoming bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-5 pt-0 sm:px-6">
          <div className="text-3xl font-semibold leading-none">
            {loading ? "--" : <NumberTicker value={upcoming} className="inline" />}
          </div>
          <div className="text-xs leading-snug text-muted-foreground">
            <span className={loading ? "invisible" : undefined}>from today</span>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-3.5">
        <CardHeader className="px-5 pb-1 sm:px-6">
          <CardTitle className="text-sm font-medium">Bookings in next 4 weeks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-5 pt-0 sm:px-6">
          <div className="text-3xl font-semibold leading-none">
            {loading ? "--" : <NumberTicker value={next4Weeks} className="inline" />}
          </div>
          <div className="text-xs leading-snug text-muted-foreground">
            <span className={loading ? "invisible" : undefined}>next 28 days</span>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-3.5">
        <CardHeader className="px-5 pb-1 sm:px-6">
          <CardTitle className="text-sm font-medium">Completed bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-5 pt-0 sm:px-6">
          <div className="text-3xl font-semibold leading-none">
            {loading ? "--" : <NumberTicker value={completed} className="inline" />}
          </div>
          <div className="text-xs leading-snug text-muted-foreground">
            <span className={loading ? "invisible" : undefined}>before today</span>
          </div>
          {error ? <div className="text-xs text-red-500">{error}</div> : null}
        </CardContent>
      </Card>
    </div>
  )
}


