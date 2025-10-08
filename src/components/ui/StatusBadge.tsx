import * as React from "react"
import { Badge } from "@/components/ui/badge"

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void" | "partial"

const statusStyles: Record<InvoiceStatus, { variant?: "default" | "secondary" | "destructive" | "outline"; className?: string; label: string }> = {
	draft: { variant: "secondary", className: "bg-gray-600 text-white dark:bg-gray-700", label: "Draft" },
	sent: { variant: "secondary", className: "bg-blue-500 text-white dark:bg-blue-600", label: "Open" },
	paid: { variant: "secondary", className: "bg-green-600 text-white dark:bg-green-700", label: "Paid" },
	overdue: { variant: "destructive", className: "", label: "Overdue" },
	void: { variant: "outline", className: "", label: "Void" },
	partial: { variant: "secondary", className: "bg-amber-500 text-white dark:bg-amber-600", label: "Partially Paid" },
}

export function StatusBadge({ status = "draft", asChild, className }: { status?: InvoiceStatus; asChild?: boolean; className?: string }) {
    const s = statusStyles[status]
    return <Badge asChild={asChild} variant={s.variant} className={`${s.className || ""} ${className || ""}`.trim()}>{s.label}</Badge>
}
