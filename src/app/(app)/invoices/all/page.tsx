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
} from "firebase/firestore"
import { getFirestoreDb } from "@/lib/firebase/client"
import { useAuth } from "@/lib/firebase/auth-context"
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  flexRender,
} from "@tanstack/react-table"
import { ChevronDown, X as XIcon } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useState } from "react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
} from "@/components/ui/pagination"
import { Checkbox } from "@/components/ui/checkbox"
import { deleteInvoice, updateInvoice } from "@/lib/firebase/invoices"
import { getDoc, doc } from "firebase/firestore"
import { toast } from "sonner"
import InvoiceForm from "@/components/invoices/InvoiceForm"
import type { InvoiceInput, InvoicePayment } from "@/lib/firebase/invoices"
import type { BankAccount } from "@/lib/firebase/user-settings"
import { getFirebaseAuth } from "@/lib/firebase/client"

type Row = {
  id: string // unique row id (parentId__pN)
  parentId: string // Firestore document id
  paymentIndex: number | null // index of payment within parent (null for legacy/no-payments)
  invoice_number: string
  issue_date: string
  due_date: string
  customer_name: string
  customer_email: string
  description: string
  currency: string
  total?: number
  status?: "draft" | "sent" | "paid" | "overdue" | "void" | "partial"
}

export default function AllInvoicesPage() {
  const { user, loading: authLoading } = useAuth()
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [selectedRow, setSelectedRow] = useState<Row | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editRequested, setEditRequested] = useState(false)
  const [selectedFull, setSelectedFull] = useState<(Partial<InvoiceInput> & { payments?: Partial<InvoicePayment>[] }) | null>(null)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const pageSize = 10
  const [pageIndex, setPageIndex] = React.useState<number>(0)
  const cursors = React.useRef<Record<number, DocumentSnapshot | null>>({})
  const [hasNextPage, setHasNextPage] = React.useState<boolean>(false)
  // Track total invoice documents to render numbered pagination similar to Events
  const [totalCount, setTotalCount] = React.useState<number>(0)

  const [sortDir] = React.useState<"asc" | "desc">("desc")

  const fetchPage = React.useCallback((targetPage: number) => {
    setLoading(true)
    const db = getFirestoreDb()
    const constraints: QueryConstraint[] = []
    constraints.push(where("ownerId", "==", user!.uid))
    constraints.push(orderBy("createdAt", sortDir))
    constraints.push(limit(pageSize + 1))
    const startCursor = cursors.current[targetPage - 1]
    if (targetPage > 0 && startCursor) constraints.push(startAfter(startCursor))
    const q = query(collection(db, "invoices"), ...constraints)
    getDocs(q)
      .then((snap) => {
        const docs = snap.docs.slice(0, pageSize)
        const pageRows: Row[] = []
        docs.forEach((d) => {
          const v = d.data() as {
            invoice_number?: string
            issue_date?: string
            due_date?: string
            customer_name?: string
            customer_email?: string
            line_items?: { description?: string; quantity?: number; unit_price?: number }[]
            payments?: { name?: string; reference?: string; currency?: string; amount?: number; invoice_number?: string; issue_date?: string; due_date?: string }[]
            status?: "draft" | "sent" | "paid" | "overdue" | "void" | "partial"
          }
          if (Array.isArray(v.payments) && v.payments.length) {
            v.payments.forEach((p, idx) => {
              const description = p.name || p.reference || v.line_items?.[0]?.description || ""
              const currency = p.currency || "GBP"
              pageRows.push({
                id: `${d.id}__p${idx}`,
                parentId: d.id,
                paymentIndex: idx,
                invoice_number: p.invoice_number || v.invoice_number || "",
                issue_date: p.issue_date || v.issue_date || "",
                due_date: p.due_date || v.due_date || "",
                customer_name: v.customer_name || "",
                customer_email: v.customer_email || "",
                description,
                currency,
                total: Number(p.amount || 0),
                status: v.status,
              })
            })
          } else {
            const itemTotal = Array.isArray(v.line_items)
              ? v.line_items.reduce((acc: number, li: { quantity?: number; unit_price?: number }) => acc + Number(li.quantity || 0) * Number(li.unit_price || 0), 0)
              : 0
            const description = v.line_items?.[0]?.description || ""
            const currency = "GBP"
            pageRows.push({
              id: `${d.id}__p0`,
              parentId: d.id,
              paymentIndex: null,
              invoice_number: v.invoice_number || "",
              issue_date: v.issue_date || "",
              due_date: v.due_date || "",
              customer_name: v.customer_name || "",
              customer_email: v.customer_email || "",
              description,
              currency,
              total: itemTotal,
              status: v.status,
            })
          }
        })
        setRows(pageRows)
        cursors.current[targetPage] = snap.docs.length > pageSize ? snap.docs[pageSize - 1] : null
        setHasNextPage(snap.docs.length > pageSize)
        setPageIndex(targetPage)
      })
      .finally(() => setLoading(false))
  }, [pageSize, sortDir, user])

  React.useEffect(() => {
    if (!authLoading && user) fetchPage(0)
  }, [authLoading, user, fetchPage])

  // Count total invoice documents owned by the user for numbered pagination tabs
  React.useEffect(() => {
    async function count() {
      const db = getFirestoreDb()
      const constraints: QueryConstraint[] = []
      constraints.push(where("ownerId", "==", user!.uid))
      const q = query(collection(db, "invoices"), ...constraints)
      const snapshot = await getCountFromServer(q)
      setTotalCount(Number(snapshot.data().count) || 0)
    }
    if (!authLoading && user) count().catch(() => setTotalCount(0))
  }, [authLoading, user, rows.length])

  function handleDownload(parentId: string) {
    setDownloadingId(parentId)
    const current = getFirebaseAuth().currentUser
    if (!current) { toast.error("Please sign in to download"); return }
    const db = getFirestoreDb()
    getDoc(doc(db, "invoices", parentId))
      .then((snap) => {
        if (!snap.exists()) { toast.error("Invoice not found"); return null }
        const data = snap.data() as Partial<InvoiceInput> & {
        include_bank_account?: boolean
        include_payment_link?: boolean
        include_notes?: boolean
        bank_account_id?: string
        bank_account?: Partial<BankAccount>
        }
        if (!data) return null
        const enrich = !data.include_bank_account || !data.bank_account_id
          ? Promise.resolve(data)
          : getDoc(doc(db, "settings_bank_accounts", String(data.bank_account_id))).then((baSnap) => {
              if (baSnap.exists()) data.bank_account = baSnap.data() as Partial<BankAccount>
              return data
            }).catch(() => data)
        return enrich
      })
      .then((data) => {
        if (!data) return null
        type MutableInvoice = Partial<InvoiceInput> & Record<string, unknown>
        const payload: MutableInvoice = { ...data }
        if (!(data.include_payment_link && data.payment_link)) delete payload.payment_link
        if (!(data.include_notes && data.notes)) delete payload.notes
        if (!data.include_bank_account) delete payload.bank_account
        return fetch("/api/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      })
      .then((res) => {
        if (!res) return
        if (!res.ok) { toast.error("Failed to generate PDF"); return }
        return res.blob()
      })
      .then((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        window.open(url, "_blank", "noopener,noreferrer")
      })
      .catch(() => toast.error("Download failed"))
      .finally(() => setDownloadingId((cur) => (cur === parentId ? null : cur)))
  }

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
      {
        accessorKey: "invoice_number",
        header: ({ column }) => (
          <Button className="justify-start px-0" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Invoice #</Button>
        ),
        cell: ({ row }) => row.original.invoice_number,
      },
      {
        accessorKey: "customer_name",
        header: ({ column }) => (
          <Button className="justify-start px-0" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Customer</Button>
        ),
        cell: ({ row }) => row.original.customer_name,
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <Button className="justify-start px-0" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Description</Button>
        ),
        cell: ({ row }) => row.original.description,
      },
      {
        accessorKey: "issue_date",
        header: ({ column }) => (
          <Button className="justify-start px-0" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Issue</Button>
        ),
        cell: ({ row }) => {
          const iso = row.original.issue_date
          return iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8,10)}-${iso.slice(5,7)}-${iso.slice(0,4)}` : iso
        },
      },
      {
        accessorKey: "due_date",
        header: ({ column }) => (
          <Button className="justify-start px-0" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Due</Button>
        ),
        cell: ({ row }) => {
          const iso = row.original.due_date
          return iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8,10)}-${iso.slice(5,7)}-${iso.slice(0,4)}` : iso
        },
      },
      {
        accessorKey: "currency",
        header: ({ column }) => (
          <Button className="justify-start px-0" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Currency</Button>
        ),
        cell: ({ row }) => row.original.currency,
      },
      {
        accessorKey: "total",
        header: ({ column }) => (
          <Button className="justify-start px-0" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Amount</Button>
        ),
        cell: ({ row }) => `${row.original.currency} ${(row.original.total ?? 0).toFixed(2)}`,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <Button className="justify-start px-0" variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Status</Button>
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className={`inline-flex ${updatingStatusId === row.original.parentId ? "pointer-events-none opacity-60" : ""}`}>
                  {updatingStatusId === row.original.parentId ? (
                    <span className="text-xs text-muted-foreground">Updating…</span>
                  ) : (
                    row.original.status ? <StatusBadge status={row.original.status} /> : <StatusBadge status="draft" />
                  )}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {[
                  { value: "draft", label: "Draft" },
                  { value: "sent", label: "Sent/Open" },
                  { value: "paid", label: "Paid" },
                  { value: "partial", label: "Partially Paid" },
                  { value: "overdue", label: "Overdue" },
                  { value: "void", label: "Void" },
                ].map((opt) => (
                  <DropdownMenuItem key={opt.value} onClick={async () => { setUpdatingStatusId(row.original.parentId); await updateInvoice(row.original.parentId, { status: opt.value as "draft" | "sent" | "paid" | "overdue" | "void" | "partial" }); toast.success("Status updated"); await fetchPage(pageIndex); setUpdatingStatusId(null) }}>
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <div className="flex justify-end w-full" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              className="relative justify-center min-w-[110px]"
              disabled={downloadingId === row.original.parentId}
              onClick={() => handleDownload(row.original.parentId)}
            >
              <span className={downloadingId === row.original.parentId ? "opacity-25" : undefined}>Download</span>
              {downloadingId === row.original.parentId && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Spinner />
                </span>
              )}
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [fetchPage, pageIndex, downloadingId, updatingStatusId]
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const [filter, setFilter] = React.useState("")
  React.useEffect(() => {
    table.getColumn("invoice_number")?.setFilterValue(filter)
  }, [filter, table])

  function openDetails(row: Row) {
    setSelectedRow(row)
    setEditRequested(false)
    setDetailLoading(true)
    const db = getFirestoreDb()
    getDoc(doc(db, "invoices", row.parentId))
      .then((snap) => setSelectedFull(snap.exists() ? snap.data() : null))
      .finally(() => setDetailLoading(false))
  }

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-4">All Invoices</h1>

      <div className="flex items-center py-4 gap-2">
        <Input
          placeholder="Filter invoice #..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table.getAllLeafColumns().map((column) => {
              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => {
                    table.resetRowSelection()
                    row.toggleSelected(true)
                    openDetails(row.original)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
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
                aria-disabled={pageIndex === 0}
                className={pageIndex === 0 ? "pointer-events-none opacity-50" : undefined}
                onClick={(e) => { e.preventDefault(); if (pageIndex > 0) fetchPage(pageIndex - 1) }}
              />
            </PaginationItem>
            {Array.from({ length: Math.max(1, Math.ceil(totalCount / pageSize)) }, (_, i) => (
              <PaginationItem key={i + 1}>
                <PaginationLink
                  href="#"
                  isActive={pageIndex === i}
                  onClick={(e) => { e.preventDefault(); if (pageIndex !== i) fetchPage(i) }}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={!hasNextPage}
                className={!hasNextPage ? "pointer-events-none opacity-50" : undefined}
                onClick={(e) => { e.preventDefault(); if (hasNextPage) fetchPage(pageIndex + 1) }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {selectedRow && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Invoice Details</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setEditRequested(true)}>Edit</Button>
                <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                  <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                    <XIcon className="mr-2 h-4 w-4" /> Delete
                  </Button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={async () => { await deleteInvoice(selectedRow.parentId); setConfirmOpen(false); setSelectedRow(null); await fetchPage(pageIndex); toast.success("Invoice deleted") }}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="secondary" onClick={() => setSelectedRow(null)}>Close</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div>Loading…</div>
            ) : (
              <InvoiceForm
                key={selectedRow.id}
                submitLabel="Save"
                readOnly={!editRequested}
                initial={selectedFull ?? undefined}
                onSubmitExternal={async (payload) => {
                  if (!selectedRow) return
                  await updateInvoice(selectedRow.parentId, payload)
                  toast.success("Invoice updated")
                  setEditRequested(false)
                  await fetchPage(pageIndex)
                  const db = getFirestoreDb();
                  const snap = await getDoc(doc(db, "invoices", selectedRow.parentId))
                  const data = snap.exists() ? (snap.data() as Partial<InvoiceInput> & { payments?: Partial<InvoicePayment>[] }) : null
                  setSelectedFull(data)
                }}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}


