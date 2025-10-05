"use client"
import React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { navMain } from "@/lib/nav"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ModeToggle } from "@/components/mode-toggle"
import { AuthGuard } from "@/components/auth-guard"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname?.()

  function getBreadcrumb() {
    // Find matching section and item from nav map
    for (const section of navMain) {
      if (pathname === section.url) {
        return [
          { href: section.url, label: section.title },
        ]
      }
      for (const item of section.items ?? []) {
        if (pathname === item.url) {
          return [
            { href: section.url, label: section.title },
            { href: item.url, label: item.title },
          ]
        }
      }
    }
    return []
  }
  const crumbs = getBreadcrumb()
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  {crumbs.length === 0 ? (
                    <BreadcrumbItem>
                      <BreadcrumbPage>Dashboard</BreadcrumbPage>
                    </BreadcrumbItem>
                  ) : (
                    crumbs.map((c, i) => (
                      <React.Fragment key={`${c.href}:${i}`}>
                        <BreadcrumbItem className={i < crumbs.length - 1 ? "hidden md:block" : undefined}>
                          {i < crumbs.length - 1 ? (
                            <BreadcrumbLink asChild>
                              <Link href={c.href}>{c.label}</Link>
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage>{c.label}</BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                        {i < crumbs.length - 1 && (
                          <BreadcrumbSeparator className="hidden md:block" />
                        )}
                      </React.Fragment>
                    ))
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="ml-auto px-4">
              <ModeToggle />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}


