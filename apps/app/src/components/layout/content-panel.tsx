import * as React from "react"

import { cn } from "@/lib/utils"

type ContentPanelProps = {
  className?: string
  /** Heading — string or custom node (e.g. title + Badge) */
  title?: React.ReactNode
  /** Muted text under the title */
  description?: React.ReactNode
  children: React.ReactNode
}

/**
 * Single bordered panel with equal inset on all sides for app pages.
 * Prefer this over re-styling Card on every screen.
 */
export function ContentPanel({ className, title, description, children }: ContentPanelProps) {
  const hasHeader = title != null || description != null
  return (
    <section
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm",
        "p-6 md:p-8",
        className
      )}
    >
      {hasHeader ? (
        <header className="mb-5 space-y-1.5">
          {title != null ? <div className="text-base font-semibold leading-none">{title}</div> : null}
          {description != null ? <div className="text-sm text-muted-foreground">{description}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  )
}
