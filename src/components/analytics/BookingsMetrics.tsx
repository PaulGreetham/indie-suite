"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getFirestoreDb } from "@/lib/firebase/client"
import { collection, getDocs } from "firebase/firestore"
import { startOfYear, endOfYear, parseISO, isWithinInterval, addDays } from "date-fns"

type EventDoc = { startsAt?: string }

export function BookingsMetrics() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [totalYtd, setTotalYtd] = React.useState(0)
  const [upcoming, setUpcoming] = React.useState(0)
  const [next4Weeks, setNext4Weeks] = React.useState(0)
  const [completed, setCompleted] = React.useState(0)

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      const db = getFirestoreDb()
      const snap = await getDocs(collection(db, "events"))
      const now = new Date()
      const fourWeeks = addDays(now, 28)
      const yStart = startOfYear(now)
      const yEnd = endOfYear(now)

      let ytd = 0
      let up = 0
      let n4 = 0
      let comp = 0
      snap.forEach((d) => {
        const ev = d.data() as EventDoc
        if (!ev.startsAt) return
        const dt = parseISO(ev.startsAt)
        if (isWithinInterval(dt, { start: yStart, end: yEnd })) ytd += 1
        if (dt >= now) up += 1
        if (dt >= now && dt <= fourWeeks) n4 += 1
        if (dt < now) comp += 1
      })

      if (!mounted) return
      setTotalYtd(ytd)
      setUpcoming(up)
      setNext4Weeks(n4)
      setCompleted(comp)
    }
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false))
    return () => { mounted = false }
  }, [])

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <Card className="gap-0 py-4">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium">Total bookings this year</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="text-3xl font-semibold">{loading ? "--" : totalYtd.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">YTD ({new Date().getFullYear()})</div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-4">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium">Upcoming bookings</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="text-3xl font-semibold">{loading ? "--" : upcoming.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">from today</div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-4">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium">Bookings in next 4 weeks</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="text-3xl font-semibold">{loading ? "--" : next4Weeks.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">next 28 days</div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-4">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium">Completed bookings</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="text-3xl font-semibold">{loading ? "--" : completed.toLocaleString()}</div>
          {error ? <div className="text-xs text-red-500 mt-1">{error}</div> : null}
        </CardContent>
      </Card>
    </div>
  )
}


