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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { updateCustomer, deleteCustomer } from "@/lib/firebase/customers"
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
import { CustomerForm, type CustomerFormValues } from "@/components/customers/CustomerForm"

type Row = {
  id: string
  fullName: string
  company?: string | null
  email: string
  phone?: string | null
  website?: string | null
  address?: {
    building?: string
    street?: string
    city?: string
    area?: string
    postcode?: string
    country?: string
  } | null
  preferredContact?: "email" | "phone" | "other" | null
  notes?: string | null
  createdAt?: string | null
}

export default function AllCustomersPage() {
  const { user, loading: authLoading } = useAuth()
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    addressFull: false,
    preferredContact: false,
  })
  const [rowSelection, setRowSelection] = React.useState({})
  const [selectedRow, setSelectedRow] = useState<Row | null>(null)
  // Using unified form component; no separate edit mode flag needed
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editRequested, setEditRequested] = useState(false)
  const pageSize = 10
  const [pageIndex, setPageIndex] = React.useState<number>(0)
  const cursors = React.useRef<Record<number, DocumentSnapshot | null>>({})
  const [hasNextPage, setHasNextPage] = React.useState<boolean>(false)
  const [totalCount, setTotalCount] = React.useState<number>(0)

  // External sort config used for Firestore query
  // Use case-insensitive sort field stored on documents
  const [sortKey] = React.useState<string>("fullNameLower")
  const [sortDir] = React.useState<"asc" | "desc">("asc")

  const fetchPage = React.useCallback((targetPage: number) => {
    setLoading(true)
    const db = getFirestoreDb()
    const constraints: QueryConstraint[] = []
    constraints.push(where("ownerId", "==", user!.uid))
    constraints.push(orderBy(sortKey, sortDir))
    constraints.push(limit(pageSize + 1))
    const startCursor = cursors.current[targetPage - 1]
    if (targetPage > 0 && startCursor) constraints.push(startAfter(startCursor))
    const q = query(collection(db, "customers"), ...constraints)
    getDocs(q)
      .then((snap) => {
        setHasNextPage(snap.docs.length > pageSize)
        const docs = snap.docs.slice(0, pageSize)
        const data: Row[] = docs.map((d) => {
          const v = d.data() as Record<string, unknown>
          const prefRaw = (v.preferredContact as string | null) ?? null
          const pref = prefRaw === "email" || prefRaw === "phone" || prefRaw === "other" ? prefRaw : null
          return {
            id: d.id,
            fullName: (v.fullName as string) ?? "",
            company: (v.company as string | null) ?? null,
            email: (v.email as string) ?? "",
            phone: (v.phone as string | null) ?? null,
            website: (v.website as string | null) ?? null,
            address: (v.address as Row["address"]) ?? null,
            preferredContact: pref,
            notes: (v.notes as string | null) ?? null,
            createdAt:
              typeof (v as { createdAt?: { toDate?: () => Date } }).createdAt?.toDate === "function"
                ? (v as { createdAt: { toDate: () => Date } }).createdAt
                    .toDate()
                    .toISOString()
                : null,
          }
        })
        setRows(data)
        cursors.current[targetPage] = docs[docs.length - 1] ?? null
        setPageIndex(targetPage)
      })
      .finally(() => setLoading(false))
  }, [sortKey, sortDir, pageSize, user])

  React.useEffect(() => {
    if (!authLoading && user) {
      cursors.current = {}
      fetchPage(0)
    }
  }, [authLoading, user, fetchPage])

  // Fetch total count for pagination numbers
  React.useEffect(() => {
    async function fetchCount() {
      const db = getFirestoreDb()
      const constraints: QueryConstraint[] = [where("ownerId", "==", user!.uid)]
      const q = query(collection(db, "customers"), ...constraints)
      const snapshot = await getCountFromServer(q)
      setTotalCount(Number(snapshot.data().count) || 0)
    }
    if (!authLoading && user) {
      fetchCount().catch(() => setTotalCount(0))
    }
  }, [authLoading, user, pageIndex, rows.length])

  const totalPages = React.useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize]
  )

  const columns = React.useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: "select",
        header: () => null,
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
      { accessorKey: "company", header: "Name", cell: ({ row }) => row.original.company ?? "—" },
      { accessorKey: "fullName", header: "Contact" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone ?? "—" },
      {
        id: "city",
        header: "City/Town",
        cell: ({ row }) => row.original.address?.city ?? "—",
      },
      {
        accessorKey: "website",
        header: "Website",
        cell: ({ row }) =>
          row.original.website ? (
            <a
              className="underline text-foreground dark:text-primary"
              href={row.original.website!}
              target="_blank"
              rel="noreferrer"
            >
              {row.original.website}
            </a>
          ) : (
            "—"
          ),
      },
      {
        id: "addressFull",
        header: "Address",
        cell: ({ row }) => {
          const a = row.original.address
          if (!a) return "—"
          return [a.building, a.street, a.city, a.area, a.postcode, a.country]
            .filter(Boolean)
            .join(", ")
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data: rows,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
  })

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-4">All Customers</h1>

      <div className="flex flex-wrap items-center gap-3 py-4">
        <Input
          placeholder="Filter customer name/contact..."
          value={(table.getColumn("fullName")?.getFilterValue() as string) ?? ""}
          onChange={(e) => table.getColumn("fullName")?.setFilterValue(e.target.value)}
          className="max-w-sm"
        />

        

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender( // ✅ FIXED
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length}>Loading…</TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>No customers yet.</TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => {
                    table.resetRowSelection()
                    row.toggleSelected(true)
                    setEditRequested(false)
                    setSelectedRow(row.original)
                  }}
                  className={selectedRow?.id === row.original.id ? "bg-muted/30" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender( // ✅ also best practice for cells
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination directly under table */}
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
            {Array.from({ length: totalPages }, (_, i) => (
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

      {/* Details + actions */}
      {selectedRow && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-xl">{selectedRow.company || selectedRow.fullName}</CardTitle>
            <CardAction className="flex gap-2">
              <Button variant="secondary" onClick={() => { /* enable edit by toggling readOnly off */ setEditRequested(true) }}>Edit</Button>
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>Delete</Button>
              <Button variant="ghost" onClick={() => { setSelectedRow(null); table.resetRowSelection(); setEditRequested(false) }} title="Close">
                <XIcon className="size-4" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <CustomerForm
              key={selectedRow.id}
              initial={{
                company: selectedRow.company ?? undefined,
                fullName: selectedRow.fullName,
                email: selectedRow.email,
                phone: selectedRow.phone ?? undefined,
                website: selectedRow.website ?? undefined,
                address: selectedRow.address ?? undefined,
                notes: selectedRow.notes ?? undefined,
              }}
              readOnly={!editRequested}
              submitLabel="Save"
              onSubmit={async (values: CustomerFormValues) => {
                await updateCustomer(selectedRow.id, {
                  fullName: values.fullName,
                  company: values.company,
                  email: values.email,
                  phone: values.phone,
                  website: values.website,
                  address: values.address,
                  notes: values.notes,
                })
                // Optimistically update current selection
                setSelectedRow((prev) =>
                  prev && prev.id === selectedRow.id
                    ? {
                        ...prev,
                        fullName: values.fullName,
                        company: values.company ?? null,
                        email: values.email,
                        phone: values.phone ?? null,
                        website: values.website ?? null,
                        address: values.address ?? null,
                        notes: values.notes ?? null,
                      }
                    : prev
                )
                setEditRequested(false)
                fetchPage(pageIndex)
                toast.success("Customer saved")
              }}
              onCancel={() => { setEditRequested(false) }}
            />
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer</AlertDialogTitle>
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
                await deleteCustomer(selectedRow.id)
                setConfirmOpen(false)
                setSelectedRow(null)
                fetchPage(pageIndex)
                toast.success("Customer deleted")
              }}>Delete</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}