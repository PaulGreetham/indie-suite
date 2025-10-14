"use client"

import * as React from "react"
import {
  collection,
  getDocs,
  getCountFromServer,
  orderBy,
  query,
  startAfter,
  limit,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
  getDoc,
  doc,
} from "firebase/firestore"
import { getFirestoreDb } from "@/lib/firebase/client"
import { useAuth } from "@/lib/firebase/auth-context"
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { deleteEvent } from "@/lib/firebase/events"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { X as XIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
} from "@/components/ui/pagination"
import { EventForm, type EventFormValues } from "@/components/events/EventForm"
import { updateEvent } from "@/lib/firebase/events"

type Row = {
  id: string
  title: string
  startsAt: string | null
  endsAt: string | null
  customerId: string
  venueId: string
  notes: string | null
}

export default function AllEventsPage() {
  const { user, loading: authLoading } = useAuth()
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const pageSize = 10
  const [pageIndex, setPageIndex] = React.useState<number>(0)
  const cursors = React.useRef<Record<number, DocumentSnapshot | null>>({})
  // pagination/count available for future UI (e.g., controls, header badges)
  const [hasNextPage, setHasNextPage] = React.useState<boolean>(false)
  const [totalCount, setTotalCount] = React.useState<number>(0)
  const [selectedRow, setSelectedRow] = React.useState<Row | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [customerIdToName, setCustomerIdToName] = React.useState<Record<string, string>>({})
  const [venueIdToName, setVenueIdToName] = React.useState<Record<string, string>>({})
  const [editRequested, setEditRequested] = React.useState(false)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const columns = React.useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: "select",
        header: () => null,
        cell: ({ row }) => (
          <span onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          </span>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      { accessorKey: "title", header: "Title" },
      { id: "customer", header: "Customer", cell: ({ row }) => customerIdToName[row.original.customerId] ?? "—" },
      { id: "venue", header: "Venue", cell: ({ row }) => venueIdToName[row.original.venueId] ?? "—" },
      { accessorKey: "startsAt", header: "Start", cell: ({ row }) => row.original.startsAt ? new Date(row.original.startsAt).toLocaleString() : "—" },
      { accessorKey: "endsAt", header: "End", cell: ({ row }) => row.original.endsAt ? new Date(row.original.endsAt).toLocaleString() : "—" },
    ],
    [customerIdToName, venueIdToName]
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    state: { rowSelection, columnFilters },
  })

  const fetchPage = React.useCallback(async (targetPage: number) => {
    setLoading(true)
    try {
      const db = getFirestoreDb()
      const constraints: QueryConstraint[] = [where("ownerId", "==", user!.uid), orderBy("startsAt", "desc"), limit(pageSize + 1)]
      const startCursor = cursors.current[targetPage - 1]
      if (targetPage > 0 && startCursor) constraints.push(startAfter(startCursor))
      const q = query(collection(db, "events"), ...constraints)
      const snap = await getDocs(q)
      setHasNextPage(snap.docs.length > pageSize)
      const docs = snap.docs.slice(0, pageSize)
      const data: Row[] = docs.map((d) => {
        const v = d.data() as {
          title?: unknown
          startsAt?: { toDate?: () => Date } | unknown
          endsAt?: { toDate?: () => Date } | unknown
          customerId?: unknown
          venueId?: unknown
          notes?: unknown
        }
        return {
          id: d.id,
          title: typeof v.title === "string" ? v.title : "",
          startsAt: typeof (v.startsAt as { toDate?: () => Date } | undefined)?.toDate === "function"
            ? (v.startsAt as { toDate: () => Date }).toDate().toISOString()
            : (typeof v.startsAt === "string" ? v.startsAt : null),
          endsAt: typeof (v.endsAt as { toDate?: () => Date } | undefined)?.toDate === "function"
            ? (v.endsAt as { toDate: () => Date }).toDate().toISOString()
            : (typeof v.endsAt === "string" ? v.endsAt : null),
          customerId: typeof v.customerId === "string" ? v.customerId : "",
          venueId: typeof v.venueId === "string" ? v.venueId : "",
          notes: typeof v.notes === "string" ? v.notes : null,
        }
      })
      setRows(data)
      cursors.current[targetPage] = docs[docs.length - 1] ?? null
      setPageIndex(targetPage)
    } finally {
      setLoading(false)
    }
  }, [user])

  React.useEffect(() => {
    if (!authLoading && user) fetchPage(0)
  }, [authLoading, user, fetchPage])

  React.useEffect(() => {
    async function count() {
      const db = getFirestoreDb()
      const q = query(collection(db, "events"), where("ownerId", "==", user!.uid))
      const snapshot = await getCountFromServer(q)
      setTotalCount(Number(snapshot.data().count) || 0)
    }
    if (!authLoading && user) count().catch(() => setTotalCount(0))
  }, [authLoading, user, rows.length])

  // Fetch display names for customers and venues present in current page
  React.useEffect(() => {
    async function resolveNames() {
      const db = getFirestoreDb()
      const neededCustomerIds = Array.from(new Set(rows.map((r) => r.customerId).filter(Boolean)))
        .filter((id) => !(id in customerIdToName))
      const neededVenueIds = Array.from(new Set(rows.map((r) => r.venueId).filter(Boolean)))
        .filter((id) => !(id in venueIdToName))
      const customerEntries = await Promise.all(
        neededCustomerIds.map(async (id) => {
          const snap = await getDoc(doc(db, "customers", id))
          if (!snap.exists()) return [id, "—"] as const
          const v = snap.data() as { company?: string; fullName?: string }
          const name = (v.company && String(v.company)) || (v.fullName && String(v.fullName)) || "—"
          return [id, name] as const
        })
      )
      const venueEntries = await Promise.all(
        neededVenueIds.map(async (id) => {
          const snap = await getDoc(doc(db, "venues", id))
          if (!snap.exists()) return [id, "—"] as const
          const v = snap.data() as { name?: string }
          const name = (v.name && String(v.name)) || "—"
          return [id, name] as const
        })
      )
      if (customerEntries.length) setCustomerIdToName((m) => ({ ...m, ...Object.fromEntries(customerEntries) }))
      if (venueEntries.length) setVenueIdToName((m) => ({ ...m, ...Object.fromEntries(venueEntries) }))
    }
    if (rows.length) {
      resolveNames().catch(() => void 0)
    }
  }, [rows, customerIdToName, venueIdToName])

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-4">All Events</h1>
      <div className="flex flex-wrap items-center gap-3 py-4">
        <Input
          placeholder="Filter event title..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(e) => table.getColumn("title")?.setFilterValue(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={columns.length}>Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length}>No events yet.</TableCell></TableRow>
            ) : (
              table.getRowModel().rows.map((r) => (
                <TableRow
                  key={r.id}
                  data-state={r.getIsSelected() && "selected"}
                  onClick={() => {
                    table.resetRowSelection()
                    r.toggleSelected(true)
                    setSelectedRow(r.original)
                  }}
                >
                  {r.getVisibleCells().map((c) => (
                    <TableCell key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TableCell>
                  ))}
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
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (pageIndex > 0) {
                    setSelectedRow(null)
                    setEditRequested(false)
                    table.resetRowSelection()
                    fetchPage(pageIndex - 1)
                  }
                }}
              />
            </PaginationItem>
            {Array.from({ length: Math.max(1, Math.ceil(totalCount / pageSize)) }, (_, i) => (
              <PaginationItem key={i + 1}>
                <PaginationLink
                  href="#"
                  isActive={pageIndex === i}
                  onClick={(e) => {
                    e.preventDefault()
                    if (pageIndex !== i) {
                      setSelectedRow(null)
                      setEditRequested(false)
                      table.resetRowSelection()
                      fetchPage(i)
                    }
                  }}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (hasNextPage) {
                    setSelectedRow(null)
                    setEditRequested(false)
                    table.resetRowSelection()
                    fetchPage(pageIndex + 1)
                  }
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {selectedRow && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-xl">{selectedRow.title}</CardTitle>
            <CardAction className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditRequested(true)}>Edit</Button>
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>Delete</Button>
              <Button variant="ghost" onClick={() => { setSelectedRow(null); setEditRequested(false); table.resetRowSelection(); }} title="Close">
                <XIcon className="size-4" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <EventForm
              key={selectedRow.id}
              initial={{
                title: selectedRow.title,
                startsAt: selectedRow.startsAt ? new Date(selectedRow.startsAt) : undefined,
                endsAt: selectedRow.endsAt ? new Date(selectedRow.endsAt) : undefined,
                customerId: selectedRow.customerId,
                venueId: selectedRow.venueId,
                notes: selectedRow.notes ?? undefined,
              }}
              readOnly={!editRequested}
              submitLabel="Save"
              onSubmit={async (vals: EventFormValues) => {
                await updateEvent(selectedRow.id, {
                  title: vals.title,
                  startsAt: vals.startsAt ? vals.startsAt.toISOString() : undefined,
                  endsAt: vals.endsAt ? vals.endsAt.toISOString() : undefined,
                  notes: vals.notes,
                  customerId: vals.customerId,
                  venueId: vals.venueId,
                })
                setEditRequested(false)
                fetchPage(pageIndex)
                toast.success("Event saved")
              }}
              onCancel={() => setEditRequested(false)}
            />
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="outline">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={async () => {
                if (!selectedRow) return
                await deleteEvent(selectedRow.id)
                setConfirmOpen(false)
                setSelectedRow(null)
                fetchPage(pageIndex)
                toast.success("Event deleted")
              }}>Delete</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


