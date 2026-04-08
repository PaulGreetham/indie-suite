"use client"
import React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
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
import { BusinessProvider } from "@/lib/business-context"
import { AuthGuard } from "@/components/auth-guard"
import { InfoPopover } from "@/components/ui/info-popover"
import { helpByPath } from "@/lib/help"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

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
  const [showIntro, setShowIntro] = React.useState(false)
  const router = useRouter()
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const seen = window.localStorage.getItem("introShown")
    if (!seen) {
      // Only show on very first visit after login
      window.localStorage.setItem("introShown", "1")
      setShowIntro(true)
    }
  }, [])
  return (
    <AuthGuard>
      <BusinessProvider>
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
                            <div className="flex items-center gap-2">
                              <BreadcrumbPage>{c.label}</BreadcrumbPage>
                              {helpByPath[c.href] ? (
                                <InfoPopover side="right" align="start">{helpByPath[c.href]}</InfoPopover>
                              ) : null}
                            </div>
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
            <div className="ml-auto flex items-center gap-6 px-4">
              <Link href="/" className="inline-flex items-center">
                <Image src="/assets/lightlonglogo.svg" alt="IndieSuite" width={140} height={22} className="dark:hidden" priority />
                <Image src="/assets/darklonglogo.svg" alt="IndieSuite" width={140} height={22} className="hidden dark:block" priority />
              </Link>
              <ModeToggle />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {children}
          </div>
          {/* First‑run onboarding dialog */}
          <AlertDialog open={showIntro} onOpenChange={setShowIntro}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Welcome! Let’s get you started</AlertDialogTitle>
                <AlertDialogDescription>
                  To help you get up and running, we’ve put together a short overview with the key steps. You can follow it at your own pace.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction asChild>
                  <Button onClick={() => { setShowIntro(false); router.push("/tutorial") }}>Let’s go</Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </SidebarInset>
        </SidebarProvider>
      </BusinessProvider>
    </AuthGuard>
  )
}


