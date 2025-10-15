"use client"

import * as React from "react"
import { getFirestoreDb } from "@/lib/firebase/client"
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/firebase/auth-context"
import { Input } from "@/components/ui/input"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import Link from "next/link"

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
  // debug removed

  const fetchAll = React.useCallback(async () => {
    const db = getFirestoreDb()
    let list: ContractRow[] = []

    // Server-first (Admin) to ensure we see existing docs
    const res = await fetch(`/api/contracts/list?ownerId=${encodeURIComponent(user?.uid || "")}`).catch(() => null)
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
  }, [user?.uid])

  React.useEffect(() => {
    if (!authLoading && user) {
      fetchAll().catch(() => setAllRows([]))
    }
  }, [authLoading, user, fetchAll])

  React.useEffect(() => {
    const start = pageIndex * pageSize
    const end = start + pageSize
    const visible = allRows.slice(start, end)
    setRows(visible)
  }, [allRows, pageIndex])

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
              <TableHead className="w-[30%]">Title</TableHead>
              <TableHead className="w-[30%]">Event</TableHead>
              <TableHead className="w-[20%]">Status</TableHead>
              <TableHead className="w-[20%]">Actions</TableHead>
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
                <TableRow key={r.id}>
                  <TableCell className="font-medium"><Link href={`/contracts/${r.id}`} className="underline text-foreground">{r.title || `Contract ${r.id.slice(0,6)}`}</Link></TableCell>
                  <TableCell>{r.eventId ? (evtById[r.eventId]?.title || r.eventId) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.status || "draft"}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.firmaUrl ? (
                      <a href={r.firmaUrl} target="_blank" rel="noreferrer" className="text-primary underline">Open in Firma</a>
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
    </div>
  )
}


