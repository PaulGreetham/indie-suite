"use client"

import * as React from "react"
import { getFirestoreDb } from "@/lib/firebase/client"
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/firebase/auth-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X as XIcon } from "lucide-react"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { toast } from "sonner"

type ContractRow = {
  id: string
  title?: string
  status?: string
  eventId?: string
  createdAt?: { seconds?: number; nanoseconds?: number }
  firmaUrl?: string | null
}

export default function AllContractsPage() {
  const { user, loading: authLoading } = useAuth()
  const [rows, setRows] = React.useState<ContractRow[]>([])
  const [evtById, setEvtById] = React.useState<Record<string, { title?: string }>>({})
  const [filter, setFilter] = React.useState("")
  const pageSize = 10
  const [pageIndex, setPageIndex] = React.useState(0)
  const [allRows, setAllRows] = React.useState<ContractRow[]>([])
  const [sortKey, setSortKey] = React.useState<"title" | "event" | "status" | "createdAt">("createdAt")
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc")
  const [selectedContract, setSelectedContract] = React.useState<(ContractRow & {
    recipients?: Array<{ email?: string; first_name?: string; last_name?: string }>
  }) | null>(null)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [sendingId, setSendingId] = React.useState<string | null>(null)
  // debug removed

  const fetchAll = React.useCallback(async () => {
    const db = getFirestoreDb()
    let list: ContractRow[] = []

    // Server-first (Admin) to ensure we see existing docs
    const token = user ? await user.getIdToken().catch(() => "") : ""
    const res = token
      ? await fetch(`/api/contracts/list?ownerId=${encodeURIComponent(user?.uid || "")}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
      : null
    if (res?.ok) {
      const data = (await res.json().catch(() => ({}))) as { docs?: Array<Record<string, unknown>> }
      if (Array.isArray(data.docs) && data.docs.length) {
        list = data.docs.map((d) => ({ id: String((d as { id?: string }).id || ""), ...(d as Omit<ContractRow, "id">) }))
      }
    }

    // 2) If server not available or empty, try client queries
    if (list.length === 0) {
      const [snapUser, snapNull] = await Promise.all([
        getDocs(query(collection(db, "contracts"), where("ownerId", "==", user?.uid || "__NONE__"))),
        getDocs(query(collection(db, "contracts"), where("ownerId", "==", null))),
      ])
      
      let combined = [...snapUser.docs, ...snapNull.docs]
      if (combined.length === 0) {
        const snapAll = await getDocs(collection(db, "contracts")).catch(() => null)
        if (snapAll) combined = snapAll.docs
      }
      list = combined.map((d) => ({ id: d.id, ...(d.data() as Omit<ContractRow, "id">) }))
    }
    // Sort by createdAt desc if present
    list.sort((a, b) => ((b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
    setAllRows(list)
    
    setPageIndex(0)

    // Preload event titles
    const uniqueEvtIds = Array.from(new Set(list.map((r) => r.eventId).filter(Boolean) as string[]))
    const entries = await Promise.all(uniqueEvtIds.map(async (id) => {
      const s = await getDoc(doc(db, "events", id))
      return [id, (s.exists() ? (s.data() as { title?: string }) : { title: id })] as const
    }))
    setEvtById(Object.fromEntries(entries))
  }, [user])

  React.useEffect(() => {
    if (!authLoading && user) {
      fetchAll().catch(() => setAllRows([]))
    }
  }, [authLoading, user, fetchAll])

  React.useEffect(() => {
    function getEventTitle(r: ContractRow): string {
      return r.eventId ? (evtById[r.eventId]?.title || r.eventId) || "" : ""
    }
    const sorted = [...allRows].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1
      if (sortKey === "createdAt") {
        const av = (a.createdAt?.seconds || 0)
        const bv = (b.createdAt?.seconds || 0)
        return (av - bv) * mul
      }
      const ax = sortKey === "title" ? (a.title || "") : sortKey === "status" ? (a.status || "") : getEventTitle(a)
      const bx = sortKey === "title" ? (b.title || "") : sortKey === "status" ? (b.status || "") : getEventTitle(b)
      return ax.localeCompare(bx) * mul
    })
    const start = pageIndex * pageSize
    const end = start + pageSize
    setRows(sorted.slice(start, end))
  }, [allRows, pageIndex, sortKey, sortDir, evtById])

  async function openDetails(row: ContractRow) {
    setSelectedContract(row)
    setDetailLoading(true)
    const db = getFirestoreDb()
    const snap = await getDoc(doc(db, "contracts", row.id)).catch(() => null)
    setSelectedContract(snap?.exists() ? ({ id: row.id, ...(snap.data() as Omit<ContractRow, "id">) }) : row)
    setDetailLoading(false)
  }

  async function handleSend(contractId: string) {
    const token = await getFirebaseAuth().currentUser?.getIdToken().catch(() => "")
    if (!token) {
      toast.error("Please sign in again")
      return
    }

    setSendingId(contractId)
    try {
      const res = await fetch("/api/contracts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: contractId }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!res.ok) {
        toast.error(body.message || body.error || "Failed to send")
        return
      }
      toast.success("Signing request sent")
      await fetchAll()
      await openDetails({ ...(selectedContract || { id: contractId }), id: contractId })
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">All Contracts</h1>
      {authLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : null}
      <div className="flex items-center gap-3 mb-3">
        <Input placeholder="Filter contracts..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
      </div>
      
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn("cursor-pointer select-none")} onClick={() => { setSortDir(sortKey === "title" && sortDir === "asc" ? "desc" : "asc"); setSortKey("title") }}>
                <div className="flex items-center gap-1">Title <span className="text-xs opacity-70">{sortKey === "title" ? (sortDir === "asc" ? "▲" : "▼") : ""}</span></div>
              </TableHead>
              <TableHead className={cn("cursor-pointer select-none")} onClick={() => { setSortDir(sortKey === "event" && sortDir === "asc" ? "desc" : "asc"); setSortKey("event") }}>
                <div className="flex items-center gap-1">Event <span className="text-xs opacity-70">{sortKey === "event" ? (sortDir === "asc" ? "▲" : "▼") : ""}</span></div>
              </TableHead>
              <TableHead className={cn("cursor-pointer select-none")} onClick={() => { setSortDir(sortKey === "status" && sortDir === "asc" ? "desc" : "asc"); setSortKey("status") }}>
                <div className="flex items-center gap-1">Status <span className="text-xs opacity-70">{sortKey === "status" ? (sortDir === "asc" ? "▲" : "▼") : ""}</span></div>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.filter(r => {
                const f = filter.trim().toLowerCase()
                if (!f) return true
                return (
                  (r.title || "").toLowerCase().includes(f) ||
                  (r.eventId && (evtById[r.eventId]?.title || r.eventId).toLowerCase().includes(f))
                )
              }).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No contracts yet.</TableCell>
              </TableRow>
            ) : (
              rows.filter(r => {
                const f = filter.trim().toLowerCase()
                if (!f) return true
                return (
                  (r.title || "").toLowerCase().includes(f) ||
                  (r.eventId && (evtById[r.eventId]?.title || r.eventId).toLowerCase().includes(f))
                )
              }).map((r) => (
                <TableRow
                  key={r.id}
                  onClick={() => openDetails(r)}
                  className={cn("cursor-pointer", selectedContract?.id === r.id && "bg-muted/30")}
                >
                  <TableCell className="font-medium">{r.title || `Contract ${r.id.slice(0,6)}`}</TableCell>
                  <TableCell>{r.eventId ? (evtById[r.eventId]?.title || r.eventId) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.status || "draft"}</Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {r.firmaUrl ? (
                      <a href={r.firmaUrl} target="_blank" rel="noreferrer" className="text-primary underline">View Document</a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="py-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (pageIndex > 0) setPageIndex(pageIndex - 1) }} />
            </PaginationItem>
            <PaginationItem><PaginationLink href="#" isActive>{pageIndex + 1}</PaginationLink></PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if ((pageIndex + 1) * pageSize < allRows.length) setPageIndex(pageIndex + 1) }} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {selectedContract ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {selectedContract.title || `Contract ${selectedContract.id.slice(0, 6)}`}
              <Badge variant="secondary">{selectedContract.status || "draft"}</Badge>
              {selectedContract.firmaUrl ? (
                <a href={selectedContract.firmaUrl} target="_blank" rel="noreferrer" className="text-sm font-normal text-primary underline">View Document</a>
              ) : null}
            </CardTitle>
            <CardAction className="flex gap-2">
              <Button onClick={() => handleSend(selectedContract.id)} disabled={sendingId === selectedContract.id}>
                {sendingId === selectedContract.id ? "Sending…" : "Send to Customer"}
              </Button>
              <Button variant="ghost" onClick={() => setSelectedContract(null)} title="Close">
                <XIcon className="h-4 w-4" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-2">
            {detailLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">Recipients</div>
                <div className="text-sm">
                  {selectedContract.recipients?.map((r, i) => (
                    <div key={i}>{[r.first_name, r.last_name].filter(Boolean).join(" ")} &lt;{r.email}&gt;</div>
                  )) || "—"}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}


