"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-dropdown-menu"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "./button"

type Option = { value: string; label: string }

interface SelectProps {
  value?: string
  onChange?: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  disabled?: boolean
  prefixItems?: { label: string; href: string }[]
}

// Lightweight shadcn-style select built on DropdownMenu
function Select({ value, onChange, options, placeholder, className, disabled, prefixItems }: SelectProps) {
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const [contentMinWidth, setContentMinWidth] = React.useState<number | undefined>(undefined)
  const selected = options.find((o) => o.value === value)

  React.useLayoutEffect(() => {
    if (!triggerRef.current) return
    const ro = new ResizeObserver(() => {
      setContentMinWidth(triggerRef.current ? triggerRef.current.offsetWidth : undefined)
    })
    ro.observe(triggerRef.current)
    setContentMinWidth(triggerRef.current.offsetWidth)
    return () => ro.disconnect()
  }, [])

  return (
    <SelectPrimitive.Root>
      <SelectPrimitive.Trigger asChild disabled={disabled}>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          className={cn("w-full justify-between", className)}
        >
          <span className={cn(!selected && "text-muted-foreground")}> 
            {selected ? selected.label : placeholder ?? "Select"}
          </span>
          <ChevronDown className="opacity-60" />
        </Button>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content sideOffset={6} align="end" style={{ minWidth: contentMinWidth }} className="z-50 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
        {prefixItems && prefixItems.length > 0 ? (
          <>
            {prefixItems.map((pi) => (
              <SelectPrimitive.Item key={pi.href} asChild>
                <Link
                  href={pi.href}
                  className={cn("flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground")}
                >
                  {pi.label}
                </Link>
              </SelectPrimitive.Item>
            ))}
            <div className="my-1 h-px bg-border" />
          </>
        ) : null}
        {options.map((opt) => (
          <SelectPrimitive.Item
            key={opt.value}
            className={cn(
              "flex w-full cursor-pointer select-none items-center rounded-sm px-2 h-9 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
              value === opt.value && "bg-accent text-accent-foreground"
            )}
            onSelect={() => onChange?.(opt.value)}
          >
            {opt.label}
          </SelectPrimitive.Item>
        ))}
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

export { Select, type Option as SelectOption }


