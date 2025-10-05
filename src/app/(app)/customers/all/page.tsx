"use client"

import * as React from "react"
import {
  collection,
  getDocs,
  getCountFromServer,
  orderBy,
  query,
  where,
  startAfter,
  limit,
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
  flexRender, // ✅ <-- Added this import
} from "@tanstack/react-table"
import { ChevronDown } from "lucide-react"
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
} from "@/components/ui/pagination"
//
import { Checkbox } from "@/components/ui/checkbox"

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
  preferredContact?: string | null
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
  const pageSize = 10
  const [pageIndex, setPageIndex] = React.useState<number>(0)
  const cursors = React.useRef<Record<number, DocumentSnapshot | null>>({})
  const [hasNextPage, setHasNextPage] = React.useState<boolean>(false)
  const [totalCount, setTotalCount] = React.useState<number>(0)
  const [nameFilter, setNameFilter] = React.useState<string>("")

  // External sort config used for Firestore query
  const [sortKey, setSortKey] = React.useState<keyof Row>("fullName")
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc")

  const fetchPage = React.useCallback(async (targetPage: number) => {
    setLoading(true)
    try {
      const db = getFirestoreDb()
      const constraints: QueryConstraint[] = []

      // Filters
      if (nameFilter) {
        constraints.push(where("fullName", ">=", nameFilter))
        constraints.push(where("fullName", "<=", nameFilter + "\uf8ff"))
      }
      constraints.push(orderBy(sortKey as string, sortDir))
      constraints.push(limit(pageSize + 1))

      // Pagination - use startAfter cursor if not first page
      const startCursor = cursors.current[targetPage - 1]
      if (targetPage > 0 && startCursor) constraints.push(startAfter(startCursor))

      const q = query(collection(db, "customers"), ...constraints)
      const snap = await getDocs(q)

      setHasNextPage(snap.docs.length > pageSize)

      const docs = snap.docs.slice(0, pageSize)
      const data: Row[] = docs.map((d) => {
        const v = d.data() as Record<string, unknown>
        return {
          id: d.id,
          fullName: (v.fullName as string) ?? "",
          company: (v.company as string | null) ?? null,
          email: (v.email as string) ?? "",
          phone: (v.phone as string | null) ?? null,
          website: (v.website as string | null) ?? null,
          address: (v.address as Row["address"]) ?? null,
          preferredContact: (v.preferredContact as string | null) ?? null,
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
    } finally {
      setLoading(false)
    }
  }, [nameFilter, sortKey, sortDir, pageSize])

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
      const constraints: QueryConstraint[] = []
      if (nameFilter) {
        constraints.push(where("fullName", ">=", nameFilter))
        constraints.push(where("fullName", "<=", nameFilter + "\uf8ff"))
      }
      const q = query(collection(db, "customers"), ...constraints)
      const snapshot = await getCountFromServer(q)
      setTotalCount(Number(snapshot.data().count) || 0)
    }
    if (!authLoading && user) {
      fetchCount().catch(() => setTotalCount(0))
    }
  }, [authLoading, user, nameFilter])

  const totalPages = React.useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize]
  )

  const columns = React.useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
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
      { accessorKey: "company", header: "Company", cell: ({ row }) => row.original.company ?? "—" },
      {
        accessorKey: "fullName",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => {
              setSortKey("fullName")
              setSortDir((d) => (d === "asc" ? "desc" : "asc"))
            }}
          >
            Contact
          </Button>
        ),
      },
      {
        accessorKey: "email",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => {
              setSortKey("email")
              setSortDir((d) => (d === "asc" ? "desc" : "asc"))
            }}
          >
            Email
          </Button>
        ),
      },
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
              className="text-primary underline"
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
      {
        id: "createdAt",
        header: () => (
          <Button
            variant="ghost"
            onClick={() => {
              setSortKey("createdAt")
              setSortDir((d) => (d === "asc" ? "desc" : "asc"))
            }}
          >
            Created
          </Button>
        ),
        cell: ({ row }) => {
          if (!row.original.createdAt) return "—"
          const d = new Date(row.original.createdAt)
          return d.toLocaleDateString()
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
          placeholder="Filter name..."
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
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
                <TableRow key={row.id}>
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

      <div className="py-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (pageIndex > 0) fetchPage(pageIndex - 1)
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
                    if (pageIndex !== i) fetchPage(i)
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
                  if (hasNextPage) fetchPage(pageIndex + 1)
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}