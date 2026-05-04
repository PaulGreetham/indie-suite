"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        We could not load this page. Try again, or refresh if the problem persists.
      </p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
