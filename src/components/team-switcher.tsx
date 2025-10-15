"use client"

import * as React from "react"
import { ChevronsUpDown, Plus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { getFirestoreDb, getFirebaseAuth } from "@/lib/firebase/client"
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore"

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
}) {
  const { isMobile } = useSidebar()
  const [activeTeam, setActiveTeam] = React.useState(teams[0])
  const [planLabel, setPlanLabel] = React.useState<string | null>(null)
  const [displayName, setDisplayName] = React.useState<string | null>(null)

  React.useEffect(() => {
    const ls = typeof window !== "undefined" ? window.localStorage : null
    const label = ls?.getItem?.("subscriptionPlan") || null
    if (label) setPlanLabel(label)
    const cachedName = ls?.getItem?.("businessName") || null
    if (cachedName) setDisplayName(cachedName)
  }, [])

  React.useEffect(() => {
    function loadBusinessName() {
      const auth = getFirebaseAuth()
      const user = auth.currentUser
      if (!user) return Promise.resolve()
      const db = getFirestoreDb()
      const q = query(
        collection(db, "settings_trading_details"),
        where("ownerId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(1),
      )
      return getDocs(q)
        .then((snap) => {
          const first = snap.docs[0]?.data() as { name?: unknown } | undefined
          const name = typeof first?.name === "string" && first.name.trim() ? String(first.name) : null
          if (!name) return
          setDisplayName(name)
          if (typeof window !== "undefined") window.localStorage?.setItem?.("businessName", name)
        })
        .catch(() => undefined)
    }
    loadBusinessName().catch(() => void 0)
  }, [])

  if (!activeTeam) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <activeTeam.logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName || activeTeam.name}</span>
                <span className="truncate text-xs">{planLabel || activeTeam.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Teams
            </DropdownMenuLabel>
            {teams.map((team, index) => (
              <DropdownMenuItem
                key={team.name}
                onClick={() => setActiveTeam(team)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <team.logo className="size-3.5 shrink-0" />
                </div>
                {team.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add team</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
