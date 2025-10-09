"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { getFirestoreDb } from "@/lib/firebase/client"
import { collection, getDocs, query, doc, getDoc, where } from "firebase/firestore"
import { useAuth } from "@/lib/firebase/auth-context"

//
const formatDateTime = (d: Date): string =>
  d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

export default function EventsCalendarPage() {
  const { user, loading: authLoading } = useAuth()
  const [date, setDate] = React.useState<Date | undefined>(undefined)
  const [visibleStartMonth, setVisibleStartMonth] = React.useState<Date>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [eventDates, setEventDates] = React.useState<Set<string>>(new Set())
  const calendarRef = React.useRef<HTMLDivElement>(null)
  const [calendarWidth, setCalendarWidth] = React.useState<number>(0)
  const [dayEvents, setDayEvents] = React.useState<{
    id: string
    title: string
    customer: string
    venue: string
    startsAt: string
    endsAt: string
  }[]>([])

  React.useEffect(() => {
    async function load() {
      const db = getFirestoreDb()
      // Range covers the three visible months
      const from = new Date(visibleStartMonth.getFullYear(), visibleStartMonth.getMonth(), 1)
      const to = new Date(visibleStartMonth.getFullYear(), visibleStartMonth.getMonth() + 4, 0)
      const q = query(collection(db, "events"), where("ownerId", "==", user!.uid))
      const snap = await getDocs(q)
      const dots: string[] = []
      for (const docSnap of snap.docs) {
        const data = docSnap.data() as { startsAt?: { toDate?: () => Date } | string }
        let dt: Date | null = null
        const ts = data.startsAt
        if (ts && typeof ts === "object" && "toDate" in ts && typeof (ts as { toDate: () => Date }).toDate === "function") {
          dt = (ts as { toDate: () => Date }).toDate()
        } else if (typeof ts === "string") {
          dt = new Date(ts)
        }
        if (!dt) continue
        if (dt >= from && dt <= to) dots.push(dt.toDateString())
      }
      setEventDates(new Set(dots))
    }
    if (!authLoading && user) {
      load().catch(() => setEventDates(new Set()))
    }
  }, [visibleStartMonth, authLoading, user])

  // Measure calendar width so the table can match it
  React.useEffect(() => {
    const measure = () => setCalendarWidth(calendarRef.current?.offsetWidth ?? 0)
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [visibleStartMonth])

  // Load events for the selected day
  React.useEffect(() => {
    async function loadForDay() {
      if (!date) { setDayEvents([]); return }
      const db = getFirestoreDb()
      const q = query(collection(db, "events"), where("ownerId", "==", user!.uid))
      const snap = await getDocs(q)
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
      const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
      const rows: {
        id: string
        title: string
        customerId: string
        venueId: string
        startsAt: string
        endsAt: string
      }[] = []
      for (const docSnap of snap.docs) {
        const data = docSnap.data() as {
          title?: string
          startsAt?: { toDate?: () => Date } | string
          endsAt?: { toDate?: () => Date } | string
          customerId?: string
          venueId?: string
        }
        let s: Date | null = null
        let e: Date | null = null
        const sRaw = data.startsAt
        const eRaw = data.endsAt
        if (sRaw && typeof sRaw === "object" && "toDate" in sRaw && typeof (sRaw as { toDate: () => Date }).toDate === "function") s = (sRaw as { toDate: () => Date }).toDate()
        else if (typeof sRaw === "string") s = new Date(sRaw)
        if (eRaw && typeof eRaw === "object" && "toDate" in eRaw && typeof (eRaw as { toDate: () => Date }).toDate === "function") e = (eRaw as { toDate: () => Date }).toDate()
        else if (typeof eRaw === "string") e = new Date(eRaw)
        if (!s) continue
        if (s >= start && s <= end) {
          rows.push({
            id: docSnap.id,
            title: data.title ?? "",
            customerId: data.customerId ?? "",
            venueId: data.venueId ?? "",
            startsAt: (s.toISOString()),
            endsAt: e ? e.toISOString() : "",
          })
        }
      }
      // Resolve names
      const customerEntries = await Promise.all(rows.map(async (r) => {
        if (!r.customerId) return [r.customerId, "—"] as const
        const s = await getDoc(doc(db, "customers", r.customerId))
        const v = s.data() as { company?: string; fullName?: string } | undefined
        const name = v?.company || v?.fullName || "—"
        return [r.customerId, name] as const
      }))
      const venueEntries = await Promise.all(rows.map(async (r) => {
        if (!r.venueId) return [r.venueId, "—"] as const
        const s = await getDoc(doc(db, "venues", r.venueId))
        const v = s.data() as { name?: string } | undefined
        const name = v?.name || "—"
        return [r.venueId, name] as const
      }))
      const cMap = Object.fromEntries(customerEntries)
      const vMap = Object.fromEntries(venueEntries)
      setDayEvents(rows.map((r) => ({
        id: r.id,
        title: r.title,
        customer: cMap[r.customerId] || "—",
        venue: vMap[r.venueId] || "—",
        startsAt: formatDateTime(new Date(r.startsAt)),
        endsAt: r.endsAt ? formatDateTime(new Date(r.endsAt)) : "",
      })))
    }
    if (!authLoading && user) {
      loadForDay().catch(() => setDayEvents([]))
    }
  }, [date, authLoading, user])

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-4">Calendar View</h1>
      <div ref={calendarRef} className="rounded-lg border p-2 inline-block">
        <Calendar
          mode="single"
          numberOfMonths={4}
          showOutsideDays={false}
          selected={date}
          onSelect={setDate}
          defaultMonth={visibleStartMonth}
          onMonthChange={(m) => setVisibleStartMonth(new Date(m.getFullYear(), m.getMonth(), 1))}
          className="rounded-lg"
          formatters={{ formatWeekdayName: (d) => d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2) }}
          classNames={{ day: "relative w-full h-full p-0 text-center" }}
        />
        <style>{`${Array.from(eventDates).map((ds)=>{const dt=new Date(ds);const key=dt.toLocaleDateString();return `[data-day="${key}"]{background:var(--primary);color:var(--primary-foreground);border-radius:0.375rem;}`}).join("\n")}`}</style>
      </div>
      {date && (
        <div className="mt-6" style={{ width: calendarWidth ? `${calendarWidth}px` : undefined }}>
          <h2 className="text-lg font-semibold mb-2">{date.toLocaleDateString()}</h2>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left">Event</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Venue</th>
                  <th className="px-3 py-2 text-left">Start</th>
                  <th className="px-3 py-2 text-left">End</th>
                </tr>
              </thead>
              <tbody>
                {dayEvents.length === 0 ? (
                  <tr><td className="px-3 py-3" colSpan={5}>No events</td></tr>
                ) : (
                  dayEvents.map((ev) => (
                    <tr key={ev.id} className="border-b">
                      <td className="px-3 py-2">{ev.title}</td>
                      <td className="px-3 py-2">{ev.customer}</td>
                      <td className="px-3 py-2">{ev.venue}</td>
                      <td className="px-3 py-2">{ev.startsAt}</td>
                      <td className="px-3 py-2">{ev.endsAt || ""}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


