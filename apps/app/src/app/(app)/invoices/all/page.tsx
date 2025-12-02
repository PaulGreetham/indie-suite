"use client"

import * as React from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
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
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
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

  const fetchAll = React.useCallback(async () => {
    setLoading(true)
    try {
      const db = getFirestoreDb()
      const constraints = [where("ownerId", "==", user!.uid)] as Parameters<typeof query>[1][]
      const q = query(collection(db, "invoices"), ...constraints)
      const snap = await getDocs(q)
      const pageRows: Row[] = []
      snap.docs.forEach((d) => {
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
      setPageIndex(0)
    } finally {
      setLoading(false)
    }
  }, [user])

  React.useEffect(() => {
    if (!authLoading && user) fetchAll()
  }, [authLoading, user, fetchAll])

  const totalPages = React.useMemo(() => Math.max(1, Math.ceil(rows.length / pageSize)), [rows.length, pageSize])

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

  const columns = React.useMemo<ColumnDef<Row>[]>(() => [
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
      { accessorKey: "invoice_number", header: "Invoice #", cell: ({ row }) => row.original.invoice_number },
      { accessorKey: "customer_name", header: "Customer", cell: ({ row }) => row.original.customer_name },
      { accessorKey: "description", header: "Description", cell: ({ row }) => row.original.description },
      {
        accessorKey: "issue_date",
        header: "Issue",
        cell: ({ row }) => {
          const iso = row.original.issue_date
          return iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8,10)}-${iso.slice(5,7)}-${iso.slice(0,4)}` : iso
        },
      },
      {
        accessorKey: "due_date",
        header: "Due",
        cell: ({ row }) => {
          const iso = row.original.due_date
          return iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8,10)}-${iso.slice(5,7)}-${iso.slice(0,4)}` : iso
        },
      },
      { accessorKey: "currency", header: "Currency", cell: ({ row }) => row.original.currency },
      { accessorKey: "total", header: "Amount", cell: ({ row }) => `${row.original.currency} ${(row.original.total ?? 0).toFixed(2)}` },
      {
        accessorKey: "status",
        header: "Status",
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
                  <DropdownMenuItem key={opt.value} onClick={async () => { setUpdatingStatusId(row.original.parentId); await updateInvoice(row.original.parentId, { status: opt.value as "draft" | "sent" | "paid" | "overdue" | "void" | "partial" }); toast.success("Status updated"); await fetchAll(); setUpdatingStatusId(null) }}>
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
    ], [downloadingId, updatingStatusId, fetchAll])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, pagination: { pageIndex, pageSize } },
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

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={(header.column.getCanSort() ? "cursor-pointer select-none" : undefined)
                      + (header.id === "select" ? " w-10" : "")
                      + (header.column.id === "currency" ? " w-16" : "")}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() ? (
                          <span className="text-xs opacity-70">
                            {header.column.getIsSorted() === "asc" ? "▲" : header.column.getIsSorted() === "desc" ? "▼" : ""}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </TableHead>
                ))}
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
                  className={selectedRow?.id === row.original.id ? "bg-muted/30" : undefined}
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
              <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (table.getState().pagination.pageIndex > 0) { setSelectedRow(null); setEditRequested(false); table.resetRowSelection(); table.previousPage(); setPageIndex(table.getState().pagination.pageIndex - 1) } }} />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i + 1}>
                <PaginationLink
                  href="#"
                  isActive={table.getState().pagination.pageIndex === i}
                  onClick={(e) => { e.preventDefault(); if (table.getState().pagination.pageIndex !== i) { setSelectedRow(null); setEditRequested(false); table.resetRowSelection(); table.setPageIndex(i); setPageIndex(i) } }}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (table.getState().pagination.pageIndex < totalPages - 1) { setSelectedRow(null); setEditRequested(false); table.resetRowSelection(); table.nextPage(); setPageIndex(table.getState().pagination.pageIndex + 1) } }} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {selectedRow && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardAction className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditRequested(true)}>Edit</Button>
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                <XIcon className="mr-2 h-4 w-4" /> Delete
              </Button>
              <Button variant="ghost" onClick={() => setSelectedRow(null)} title="Close">
                <XIcon className="h-4 w-4" />
              </Button>
            </CardAction>
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
                  await fetchAll()
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete? The data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={async () => {
                if (!selectedRow) return
                await deleteInvoice(selectedRow.parentId)
                setConfirmOpen(false)
                setSelectedRow(null)
                await fetchAll()
                toast.success("Invoice deleted")
              }}>Delete</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
