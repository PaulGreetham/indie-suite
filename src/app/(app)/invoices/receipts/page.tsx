"use client"

import * as React from "react"
import { collection, getDocs, query, where, type QueryConstraint } from "firebase/firestore"
import { getFirestoreDb } from "@/lib/firebase/client"
import { useAuth } from "@/lib/firebase/auth-context"
import { ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, flexRender } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { toast } from "sonner"

type Row = {
  id: string
  parentId: string
  invoice_number: string
  customer_name: string
  due_date: string
  paid_date: string
}

export default function ReceiptsPage() {
  const { user, loading: authLoading } = useAuth()
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const [pageIndex] = React.useState<number>(0)
  const [filter, setFilter] = React.useState("")
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null)

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const db = getFirestoreDb()
      // Avoid requiring a composite index: query by ownerId only, then filter/sort client-side
      const constraints: QueryConstraint[] = [where("ownerId", "==", user!.uid)]
      const q = query(collection(db, "invoices"), ...constraints)
      const snap = await getDocs(q)
      const rs: Row[] = []
      snap.forEach((d) => {
        const v = d.data() as { status?: string; invoice_number?: string; customer_name?: string; due_date?: string; payments?: { due_date?: string }[]; updatedAt?: { toDate?: () => Date } | string; createdAt?: { toDate?: () => Date } | string }
        if (v.status !== "paid") return
        const paidDateIso = typeof v.updatedAt === "object" && v.updatedAt && "toDate" in v.updatedAt ? (v.updatedAt as { toDate: () => Date }).toDate().toISOString().slice(0,10) : (typeof v.updatedAt === "string" ? v.updatedAt : "")
        rs.push({ id: d.id, parentId: d.id, invoice_number: v.invoice_number || "", customer_name: v.customer_name || "", due_date: v.due_date || v.payments?.[0]?.due_date || "", paid_date: paidDateIso })
      })
      // Sort by paid date desc then created date desc as fallback
      rs.sort((a, b) => (b.paid_date || '').localeCompare(a.paid_date || ''))
      setRows(rs)
    } finally {
      setLoading(false)
    }
  }, [user])

  React.useEffect(() => {
    if (!authLoading && user) fetchData()
  }, [authLoading, user, fetchData])

  const columns = React.useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: "invoice_number", header: () => "Invoice #", cell: ({ row }) => row.original.invoice_number },
      { accessorKey: "customer_name", header: () => "Customer", cell: ({ row }) => row.original.customer_name },
      { accessorKey: "due_date", header: () => "Due", cell: ({ row }) => row.original.due_date && /^\d{4}-\d{2}-\d{2}$/.test(row.original.due_date) ? `${row.original.due_date.slice(8,10)}-${row.original.due_date.slice(5,7)}-${row.original.due_date.slice(0,4)}` : row.original.due_date },
      { accessorKey: "paid_date", header: () => "Date Paid", cell: ({ row }) => row.original.paid_date && /^\d{4}-\d{2}-\d{2}$/.test(row.original.paid_date) ? `${row.original.paid_date.slice(8,10)}-${row.original.paid_date.slice(5,7)}-${row.original.paid_date.slice(0,4)}` : row.original.paid_date },
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
    [downloadingId]
  )

  const table = useReactTable({ data: rows.filter(r => r.invoice_number.toLowerCase().includes(filter.toLowerCase())), columns, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(), getSortedRowModel: getSortedRowModel() })

  async function handleDownload(parentId: string) {
    try {
      setDownloadingId(parentId)
      // Open the receipt route immediately to avoid blocking the UI and let the server stream the PDF
      const win = window.open(`/api/invoices/${encodeURIComponent(parentId)}/receipt`, "_blank", "noopener,noreferrer")
      if (!win) {
        // Popup blocked – fall back to fetch + blob
        const res = await fetch(`/api/invoices/${encodeURIComponent(parentId)}/receipt`, { method: "GET" })
        if (!res.ok) { toast.error("Failed to generate receipt"); return }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        window.open(url, "_blank", "noopener,noreferrer")
      }
    } catch {
      toast.error("Download failed")
    } finally {
      // Clear the spinner shortly after initiating the download to keep UI responsive
      setTimeout(() => setDownloadingId((cur) => (cur === parentId ? null : cur)), 800)
    }
  }

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-4">Receipts</h1>
      <div className="flex items-center py-4 gap-2">
        <Input placeholder="Filter invoice #..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">Loading...</TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end py-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" className="pointer-events-none opacity-50" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>{pageIndex + 1}</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" className="pointer-events-none opacity-50" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}


