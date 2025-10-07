"use client"

import * as React from "react"
import { getFirestoreDb } from "@/lib/firebase/client"
import { Card, CardContent } from "@/components/ui/card"
import { collection, getDocs, query } from "firebase/firestore"

type FeedItem = {
  id: string
  type: "event" | "invoice_due" | "payment_due" | "contract_due"
  title: string
  date: Date
  subtitle?: string
  href?: string
}

export function NotificationFeed({ showHeader = true }: { showHeader?: boolean }) {
  const [items, setItems] = React.useState<FeedItem[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      setLoading(true)
      const db = getFirestoreDb()
      const now = new Date()

      // Events (startsAt)
      const eventsQ = query(collection(db, "events"))
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
      const invSnap = await getDocs(query(collection(db, "invoices")))
      const invoiceItems: FeedItem[] = []
      invSnap.forEach((d) => {
        const v = d.data() as { due_date?: string; payments?: { due_date?: string; name?: string }[]; customer_name?: string }
        const label = v.customer_name ? `Invoice · ${v.customer_name}` : "Invoice due"
        if (v.due_date) {
          const dt = new Date(v.due_date)
          if (dt >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) invoiceItems.push({ id: `${d.id}-due`, type: "invoice_due", title: label, date: dt, href: "/invoices/all" })
        }
        for (const p of v.payments ?? []) {
          if (!p?.due_date) continue
          const dt = new Date(p.due_date)
          if (dt >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) invoiceItems.push({ id: `${d.id}-${p.due_date}`, type: "payment_due", title: p.name ? `Payment · ${p.name}` : "Payment due", date: dt, subtitle: label, href: "/invoices/all" })
        }
      })

      // Contracts (optional collection)
      let contractItems: FeedItem[] = []
      try {
        const cSnap = await getDocs(query(collection(db, "contracts")))
        contractItems = cSnap.docs.flatMap((docSnap) => {
          const v = docSnap.data() as { title?: string; dueDate?: string }
          if (!v?.dueDate) return []
          const dt = new Date(v.dueDate)
          if (dt < new Date(now.getFullYear(), now.getMonth(), now.getDate())) return []
          return [{ id: docSnap.id, type: "contract_due" as const, title: v.title || "Contract due", date: dt, href: "/contracts/all" }]
        })
      } catch {
        contractItems = []
      }

      const all = [...eventItems, ...invoiceItems, ...contractItems]
      all.sort((a, b) => a.date.getTime() - b.date.getTime())
      setItems(all)
      setLoading(false)
    }
    load().catch(() => { setItems([]); setLoading(false) })
  }, [])

  return (
    <Card className="mt-4">
      <CardContent className="py-4">
        {showHeader && <div className="mb-3 text-sm font-medium text-muted-foreground">Notification feed</div>}
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


