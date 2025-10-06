"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

export type { PopoverContentProps } from "@radix-ui/react-popover"

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>>(
  ({ className, ...props }, ref) => (
    <PopoverPrimitive.Content ref={ref} className={className} {...props} />
  )
)
PopoverContent.displayName = "PopoverContent"


