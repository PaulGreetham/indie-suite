"use client"

import * as React from "react"
import { InfoIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type InfoPopoverProps = {
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  className?: string
}

export function InfoPopover({ children, side = "top", align = "center", className }: InfoPopoverProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="More info"
          className={
            "inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          }
        >
          <InfoIcon className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align={align} className={"max-w-sm text-sm p-3 leading-relaxed " + (className || "")}>
        {children}
      </PopoverContent>
    </Popover>
  )
}


