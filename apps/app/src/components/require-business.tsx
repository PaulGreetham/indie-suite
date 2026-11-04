"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useBusiness } from "@/lib/business-context"

// Clients, venues, events, invoices and contracts all belong to a business, so their pages ask for
// business details before showing a form that can't be saved. UI only: saves still require a business.
export function RequireBusiness({ children }: { children: React.ReactNode }) {
  const { businessStatus } = useBusiness()
  const pathname = usePathname()

  if (businessStatus === "loading") return null

  if (businessStatus === "none") {
    return (
      <section className="max-w-prose space-y-3 py-2">
        <h1 className="text-2xl font-semibold">Add your business details first</h1>
        <p className="text-sm text-muted-foreground">
          Your clients, bookings, invoices and contracts belong to a business, and its name and
          contact details appear on every invoice and contract you send.
        </p>
        <Button asChild>
          <Link href={`/settings/trading-details?next=${encodeURIComponent(pathname)}`}>Add business details</Link>
        </Button>
      </section>
    )
  }

  return <>{children}</>
}
