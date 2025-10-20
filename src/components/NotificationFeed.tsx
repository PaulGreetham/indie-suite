"use client"

import * as React from "react"
import { getFirestoreDb } from "@/lib/firebase/client"
import { Card, CardContent } from "@/components/ui/card"
import { collection, getDocs, query, where } from "firebase/firestore"
import { useAuth } from "@/lib/firebase/auth-context"

type FeedItem = {
  id: string
  type: "event" | "invoice_due" | "payment_due" | "contract_due"
  title: string
  date: Date
  subtitle?: string
  href?: string
}

export function NotificationFeed({ showHeader = true, limit }: { showHeader?: boolean; limit?: number }) {
  const [items, setItems] = React.useState<FeedItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const { user, loading: authLoading } = useAuth()

  React.useEffect(() => {
    async function load() {
      setLoading(true)
      const db = getFirestoreDb()
      const now = new Date()

      // Events (startsAt)
      const eventsQ = query(collection(db, "events"), where("ownerId", "==", user!.uid))
      const eventsSnap = await getDocs(eventsQ)
      const eventItems: FeedItem[] = []
      eventsSnap.forEach((d) => {
        const v = d.data() as { title?: string; startsAt?: { toDate?: () => Date } | string }
        let s: Date | null = null
        const raw = v.startsAt
        if (raw && typeof raw === "object" && "toDate" in raw && typeof (raw as { toDate: () => Date }).toDate === "function") s = (raw as { toDate: () => Date }).toDate()
        else if (typeof raw === "string") s = new Date(raw)
        if (s && s >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
          eventItems.push({ id: d.id, type: "event", title: v.title || "Event", date: s, href: `/events/all` })
        }
      })

      // Invoices: due payments
      const invSnap = await getDocs(query(collection(db, "invoices"), where("ownerId", "==", user!.uid)))
      const invoiceItems: FeedItem[] = []
      invSnap.forEach((d) => {
        const v = d.data() as { due_date?: string; payments?: { due_date?: string; name?: string }[]; customer_name?: string }
        const label = v.customer_name ? `Invoice · ${v.customer_name}` : "Invoice due"
        const payments = Array.isArray(v.payments) ? v.payments : []
        if (payments.length > 0) {
          payments.forEach((p, idx) => {
            if (!p?.due_date) return
            const dt = new Date(p.due_date)
            if (dt >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
              invoiceItems.push({
                id: `${d.id}-p-${idx}`,
                type: "payment_due",
                title: p.name ? `Payment · ${p.name}` : "Payment due",
                date: dt,
                subtitle: label,
                href: "/invoices/all",
              })
            }
          })
        } else if (v.due_date) {
          const dt = new Date(v.due_date)
          if (dt >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
            invoiceItems.push({ id: `${d.id}-due`, type: "invoice_due", title: label, date: dt, href: "/invoices/all" })
          }
        }
      })

      // Contracts (optional collection)
      let contractItems: FeedItem[] = []
      const cSnap = await getDocs(query(collection(db, "contracts"), where("ownerId", "==", user!.uid))).catch(() => null)
      contractItems = cSnap
        ? cSnap.docs.flatMap((docSnap) => {
            const v = docSnap.data() as { title?: string; dueDate?: string }
            if (!v?.dueDate) return []
            const dt = new Date(v.dueDate)
            if (dt < new Date(now.getFullYear(), now.getMonth(), now.getDate())) return []
            return [{ id: docSnap.id, type: "contract_due" as const, title: v.title || "Contract due", date: dt, href: "/contracts/all" }]
          })
        : []

      let all = [...eventItems, ...invoiceItems, ...contractItems]
      all.sort((a, b) => a.date.getTime() - b.date.getTime())
      if (typeof limit === "number" && limit > 0) all = all.slice(0, limit)
      setItems(all)
      setLoading(false)
    }
    if (!authLoading && user) {
      load().catch(() => { setItems([]); setLoading(false) })
    }
  }, [authLoading, user, limit])

  return (
    <Card className="mt-4">
      <CardContent className="py-4">
        {showHeader && (
          <div className="mb-3 text-sm font-medium text-muted-foreground">
            Notification feed{typeof limit === "number" && limit > 0 ? ` · next ${limit}` : ""}
          </div>
        )}
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nothing scheduled yet.</div>
        ) : (
          <ul className="divide-y border rounded-md">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">
                    {it.title}
                    {it.subtitle ? <span className="text-muted-foreground"> — {it.subtitle}</span> : null}
                  </span>
                  <span className="text-muted-foreground">{it.date.toLocaleString()}</span>
                </div>
                {it.href ? (
                  <a href={it.href} className="text-primary hover:underline whitespace-nowrap">Open</a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}


