"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-dropdown-menu"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "./button"

type Option = { value: string; label: string; group?: string }

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
  const groupedOptions = React.useMemo(() => {
    const groups: { label?: string; options: Option[] }[] = []

    options.forEach((option) => {
      const currentGroup = groups[groups.length - 1]
      if (currentGroup && currentGroup.label === option.group) {
        currentGroup.options.push(option)
        return
      }

      groups.push({
        label: option.group,
        options: [option],
      })
    })

    return groups
  }, [options])

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
                  className={cn("flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:text-primary dark:hover:text-primary")}
                >
                  {pi.label}
                </Link>
              </SelectPrimitive.Item>
            ))}
            <div className="my-1 h-px bg-border" />
          </>
        ) : null}
        {groupedOptions.map((group, index) => (
          <React.Fragment key={group.label ?? `group-${index}`}>
            {index > 0 ? <div className="my-1 h-px bg-border" /> : null}
            {group.label ? (
              <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </div>
            ) : null}
            {group.options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                className={cn(
                  "flex h-9 w-full cursor-pointer select-none items-center rounded-sm px-2 text-sm outline-none data-[highlighted]:bg-transparent data-[highlighted]:text-primary data-[highlighted]:outline-none",
                  value === opt.value && "bg-accent text-accent-foreground"
                )}
                onSelect={() => onChange?.(opt.value)}
              >
                {opt.label}
              </SelectPrimitive.Item>
            ))}
          </React.Fragment>
        ))}
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

export { Select, type Option as SelectOption }


