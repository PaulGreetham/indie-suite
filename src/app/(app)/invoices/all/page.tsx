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
  type DocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore"
import { getFirestoreDb } from "@/lib/firebase/client"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
import { deleteInvoice } from "@/lib/firebase/invoices"
import InvoiceForm from "@/components/invoices/InvoiceForm"

type Row = {
  id: string
  invoice_number: string
  issue_date: string
  due_date: string
  customer_name: string
  customer_email: string
  total?: number
}

export default function AllInvoicesPage() {
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [selectedRow, setSelectedRow] = useState<Row | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editRequested, setEditRequested] = useState(false)
  const pageSize = 10
  const [pageIndex, setPageIndex] = React.useState<number>(0)
  const cursors = React.useRef<Record<number, DocumentSnapshot | null>>({})
  const [hasNextPage, setHasNextPage] = React.useState<boolean>(false)
  const [totalCount, setTotalCount] = React.useState<number>(0)

  const [sortKey] = React.useState<keyof Row>("invoice_number")
  const [sortDir] = React.useState<"asc" | "desc">("desc")

  const fetchPage = React.useCallback(async (targetPage: number) => {
    setLoading(true)
    try {
      const db = getFirestoreDb()
      const constraints: QueryConstraint[] = []
      constraints.push(orderBy(sortKey as string, sortDir))
      constraints.push(limit(pageSize + 1))
      const startCursor = cursors.current[targetPage - 1]
      if (targetPage > 0 && startCursor) constraints.push(startAfter(startCursor))
      const q = query(collection(db, "invoices"), ...constraints)
      const snap = await getDocs(q)
      const pageRows: Row[] = snap.docs.slice(0, pageSize).map((d) => {
        const v = d.data() as {
          invoice_number?: string
          issue_date?: string
          due_date?: string
          customer_name?: string
          customer_email?: string
          line_items?: { description?: string; quantity?: number; unit_price?: number }[]
        }
        const total = Array.isArray(v.line_items)
          ? v.line_items.reduce((acc: number, li: { quantity?: number; unit_price?: number }) => acc + Number(li.quantity || 0) * Number(li.unit_price || 0), 0)
          : 0
        return {
          id: d.id,
          invoice_number: v.invoice_number || "",
          issue_date: v.issue_date || "",
          due_date: v.due_date || "",
          customer_name: v.customer_name || "",
          customer_email: v.customer_email || "",
          total,
        }
      })
      setRows(pageRows)
      cursors.current[targetPage] = snap.docs.length > pageSize ? snap.docs[pageSize - 1] : null
      setHasNextPage(snap.docs.length > pageSize)
      setPageIndex(targetPage)
      const cnt = await getCountFromServer(query(collection(db, "invoices")))
      setTotalCount(cnt.data().count)
    } finally {
      setLoading(false)
    }
  }, [pageSize, sortKey, sortDir])

  React.useEffect(() => {
    fetchPage(0)
  }, [fetchPage])

  const columns = React.useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      { accessorKey: "invoice_number", header: "Invoice #" },
      { accessorKey: "customer_name", header: "Customer" },
      { accessorKey: "issue_date", header: "Issue" },
      { accessorKey: "due_date", header: "Due" },
      { accessorKey: "total", header: "Total", cell: ({ row }) => `£${(row.original.total ?? 0).toFixed(2)}` },
    ],
    []
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
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} onClick={() => openDetails(row.original)}>
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

      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} of {totalCount} rows
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" aria-disabled={pageIndex === 0} className={pageIndex === 0 ? "pointer-events-none opacity-50" : undefined} onClick={() => pageIndex > 0 && fetchPage(pageIndex - 1)} />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>{pageIndex + 1}</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" aria-disabled={!hasNextPage} className={!hasNextPage ? "pointer-events-none opacity-50" : undefined} onClick={() => hasNextPage && fetchPage(pageIndex + 1)} />
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
                      <AlertDialogAction onClick={async () => { await deleteInvoice(selectedRow.id); setConfirmOpen(false); setSelectedRow(null); fetchPage(pageIndex) }}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="secondary" onClick={() => setSelectedRow(null)}>Close</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {editRequested ? (
              <InvoiceForm onCreated={() => fetchPage(pageIndex)} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Invoice #</div>
                  <div>{selectedRow.invoice_number}</div>
                </div>
                <div>
                  <div className="font-medium">Customer</div>
                  <div>{selectedRow.customer_name} ({selectedRow.customer_email})</div>
                </div>
                <div>
                  <div className="font-medium">Issue Date</div>
                  <div>{selectedRow.issue_date}</div>
                </div>
                <div>
                  <div className="font-medium">Due Date</div>
                  <div>{selectedRow.due_date}</div>
                </div>
                <div>
                  <div className="font-medium">Total</div>
                  <div>£{(selectedRow.total ?? 0).toFixed(2)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}


