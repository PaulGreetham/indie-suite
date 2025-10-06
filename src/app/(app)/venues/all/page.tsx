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
import { updateVenue, deleteVenue } from "@/lib/firebase/venues"
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
import { VenueForm, type VenueFormValues } from "@/components/venues/VenueForm"
import { MapboxMap } from "@/components/MapboxMap"
import { Separator } from "@/components/ui/separator"
import { ExternalLink } from "lucide-react"
import { geocodeAddress } from "@/lib/mapbox"

type Row = {
  id: string
  name: string
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
  notes?: string | null
  createdAt?: string | null
}

export default function AllVenuesPage() {
  const { user, loading: authLoading } = useAuth()
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    addressFull: false,
  })
  const [rowSelection, setRowSelection] = React.useState({})
  const [selectedRow, setSelectedRow] = useState<Row | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editRequested, setEditRequested] = useState(false)
  const pageSize = 10
  const [pageIndex, setPageIndex] = React.useState<number>(0)
  const cursors = React.useRef<Record<number, DocumentSnapshot | null>>({})
  const [hasNextPage, setHasNextPage] = React.useState<boolean>(false)
  const [totalCount, setTotalCount] = React.useState<number>(0)
  const [mapSelection, setMapSelection] = React.useState<Row | null>(null)
  const [mapCenter, setMapCenter] = React.useState<{ lng: number; lat: number } | null>(null)

  const [sortKey] = React.useState<keyof Row>("name")
  const [sortDir] = React.useState<"asc" | "desc">("asc")

  const fetchPage = React.useCallback(async (targetPage: number) => {
    setLoading(true)
    try {
      const db = getFirestoreDb()
      const constraints: QueryConstraint[] = []
      constraints.push(orderBy(sortKey as string, sortDir))
      constraints.push(limit(pageSize + 1))
      const startCursor = cursors.current[targetPage - 1]
      if (targetPage > 0 && startCursor) constraints.push(startAfter(startCursor))
      const q = query(collection(db, "venues"), ...constraints)
      const snap = await getDocs(q)
      setHasNextPage(snap.docs.length > pageSize)
      const docs = snap.docs.slice(0, pageSize)
      const data: Row[] = docs.map((d) => {
        const v = d.data() as Record<string, unknown>
        return {
          id: d.id,
          name: (v.name as string) ?? "",
          phone: (v.phone as string | null) ?? null,
          website: (v.website as string | null) ?? null,
          address: (v.address as Row["address"]) ?? null,
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
    } finally {
      setLoading(false)
    }
  }, [sortKey, sortDir, pageSize])

  React.useEffect(() => {
    if (!authLoading && user) {
      cursors.current = {}
      fetchPage(0)
    }
  }, [authLoading, user, fetchPage])

  React.useEffect(() => {
    async function fetchCount() {
      const db = getFirestoreDb()
      const constraints: QueryConstraint[] = []
      const q = query(collection(db, "venues"), ...constraints)
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
      { accessorKey: "name", header: "Name" },
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
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={async (e) => {
              e.stopPropagation();
              const r = row.original
              setMapSelection(r)
              const address = [
                r.address?.building,
                r.address?.street,
                r.address?.city,
                r.address?.area,
                r.address?.postcode,
                r.address?.country,
              ].filter(Boolean).join(", ")
              const coords = await geocodeAddress(address)
              setMapCenter(coords ?? { lng: 0, lat: 0 })
            }}>
              View Map <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
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
      <h1 className="text-2xl font-semibold mb-4">All Venues</h1>

      <div className="flex flex-wrap items-center gap-3 py-4">
        <Input
          placeholder="Filter venue name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(e) => table.getColumn("name")?.setFilterValue(e.target.value)}
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
                      : flexRender(
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
                <TableCell colSpan={columns.length}>No venues yet.</TableCell>
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
                      {flexRender(
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

      {mapSelection && (
        <div className="mt-2">
          <Separator className="my-4" />
          <h2 className="text-xl font-semibold mb-2">Map: {mapSelection.name}</h2>
          <MapboxMap
            center={mapCenter ?? { lng: 0, lat: 0 }}
            marker={{
              lng: mapCenter?.lng ?? 0,
              lat: mapCenter?.lat ?? 0,
              title: mapSelection.name,
              description: [
                mapSelection.address?.building,
                mapSelection.address?.street,
                mapSelection.address?.city,
                mapSelection.address?.area,
                mapSelection.address?.postcode,
                mapSelection.address?.country,
              ]
                .filter(Boolean)
                .join(", "),
            }}
            className="w-full h-[420px]"
          />
        </div>
      )}

      {selectedRow && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-xl">{selectedRow.name}</CardTitle>
            <CardAction className="flex gap-2">
              <Button variant="secondary" onClick={() => { setEditRequested(true) }}>Edit</Button>
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>Delete</Button>
              <Button variant="ghost" onClick={() => { setSelectedRow(null); table.resetRowSelection(); setEditRequested(false) }} title="Close">
                <XIcon className="size-4" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <VenueForm
              key={selectedRow.id}
              initial={{
                name: selectedRow.name,
                phone: selectedRow.phone ?? undefined,
                website: selectedRow.website ?? undefined,
                address: selectedRow.address ?? undefined,
                notes: selectedRow.notes ?? undefined,
              }}
              readOnly={!editRequested}
              submitLabel="Save"
              onSubmit={async (values: VenueFormValues) => {
                await updateVenue(selectedRow.id, {
                  name: values.name,
                  phone: values.phone,
                  website: values.website,
                  address: values.address,
                  notes: values.notes,
                })
                setSelectedRow((prev) =>
                  prev && prev.id === selectedRow.id
                    ? {
                        ...prev,
                        name: values.name,
                        phone: values.phone ?? null,
                        website: values.website ?? null,
                        address: values.address ?? null,
                        notes: values.notes ?? null,
                      }
                    : prev
                )
                setEditRequested(false)
                fetchPage(pageIndex)
                toast.success("Venue saved")
              }}
              onCancel={() => { setEditRequested(false) }}
            />
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete venue</AlertDialogTitle>
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
                await deleteVenue(selectedRow.id)
                setConfirmOpen(false)
                setSelectedRow(null)
                fetchPage(pageIndex)
                toast.success("Venue deleted")
              }}>Delete</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

