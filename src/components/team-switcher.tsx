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
import { collection, getDocs, orderBy, query, where } from "firebase/firestore"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useBusiness } from "@/lib/business-context"

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
}) {
  type TeamItem = { id?: string; name: string; logo: React.ElementType; plan?: string }
  const { isMobile } = useSidebar()
  const { activeBusinessId, setActiveBusinessId, setActiveBusinessName } = useBusiness()
  const [activeTeam, setActiveTeam] = React.useState<TeamItem>(teams[0] || { name: "", logo: Plus, plan: "" })
  const [planLabel, setPlanLabel] = React.useState<string | null>(null)
  const [displayName, setDisplayName] = React.useState<string | null>(null)
  const [teamList, setTeamList] = React.useState<TeamItem[]>([])
  const [limitDialogOpen, setLimitDialogOpen] = React.useState(false)

  React.useEffect(() => {
    const ls = typeof window !== "undefined" ? window.localStorage : null
    const cachedName = ls?.getItem?.("businessName") || null
    if (cachedName) setDisplayName(cachedName)
    // Load plan from server (Stripe) and cache it
    async function loadPlan() {
      try {
        const auth = getFirebaseAuth()
        const email = auth.currentUser?.email
        if (!email) return
        const res = await fetch("/api/stripe/get-subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
        const data = await res.json().catch(() => null)
        const p = String(data?.plan || "").toLowerCase()
        const label = p === "pro" ? "Pro" : p === "pro+" ? "Pro +" : p === "pro++" ? "Pro ++" : "Free"
        setPlanLabel(label)
        ls?.setItem?.("subscriptionPlan", label)
      } catch {
        // ignore
      }
    }
    loadPlan().catch(() => void 0)
  }, [])

  React.useEffect(() => {
    async function loadBusinesses() {
      const auth = getFirebaseAuth()
      const user = auth.currentUser
      if (!user) return
      const db = getFirestoreDb()
      const qAll = query(
        collection(db, "settings_trading_details"),
        where("ownerId", "==", user.uid),
        orderBy("createdAt", "desc"),
      )
      const snap = await getDocs(qAll).catch(() => null)
      const items: TeamItem[] = (snap?.docs || []).map((d) => ({ id: d.id, name: String((d.data() as { name?: string })?.name || d.id), logo: Plus }))
      if (items.length > 0) {
        setTeamList(items)
        const ls = typeof window !== "undefined" ? window.localStorage : null
        const preferredId = activeBusinessId || ls?.getItem?.("activeBusinessId") || items[0].id
        const first = items.find((t) => t.id === preferredId) || items[0]
        const plan = planLabel || teams[0]?.plan || "Pro"
        setActiveTeam({ name: first.name, logo: first.logo, plan })
        setDisplayName(first.name)
        ls?.setItem?.("businessName", first.name)
        setActiveBusinessId(first.id || null)
        setActiveBusinessName(first.name)
      }
    }
    loadBusinesses().catch(() => void 0)
    function onUpdated() {
      // Force reload of businesses when a new one is created
      loadBusinesses().catch(() => void 0)
    }
    if (typeof window !== "undefined") window.addEventListener("business-updated", onUpdated)
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("business-updated", onUpdated)
    }
  }, [planLabel, teams, activeBusinessId, setActiveBusinessId, setActiveBusinessName])

  // If no businesses yet, render a minimal add button shell
  const noTeams = (teamList.length === 0)

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
                <span className="truncate font-medium">{displayName || (noTeams ? "Add business" : activeTeam.name)}</span>
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
            <DropdownMenuLabel className="text-muted-foreground text-xs">Teams</DropdownMenuLabel>
            {(teamList.length ? teamList : []).map((team, index) => (
              <DropdownMenuItem
                key={(team as TeamItem).id || team.name}
                onClick={() => {
                  const t = team as TeamItem
                  setActiveTeam(t)
                  setDisplayName(t.name)
                  setActiveBusinessId(t.id || null)
                  setActiveBusinessName(t.name)
                  if (typeof window !== "undefined") window.localStorage?.setItem?.("activeBusinessId", String(t.id || ""))
                }}
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
            {(() => {
              const limitMap: Record<string, number> = { "Pro": 1, "Pro +": 3, "Pro ++": 10 }
              const max = limitMap[planLabel || "Pro"] ?? 1
              const count = teamList.length
              const canAdd = count < max
              return (
                <DropdownMenuItem className="gap-2 p-2" onSelect={(e) => {
                  e.preventDefault()
                  if (canAdd) {
                    window.location.href = "/settings/trading-details"
                  } else {
                    setLimitDialogOpen(true)
                  }
                }}>
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <Plus className="size-4" />
                  </div>
                  <div className="text-muted-foreground font-medium">{noTeams ? "Add first business" : "Add business"}</div>
                </DropdownMenuItem>
              )
            })()}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <AlertDialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Business limit reached</AlertDialogTitle>
            <AlertDialogDescription>
              Your current plan ({planLabel || "Pro"}) has reached the maximum number of businesses allowed. Upgrade your subscription to add more businesses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Close</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={async () => {
                // Open Stripe portal
                try {
                  const email = getFirebaseAuth().currentUser?.email
                  if (!email) { setLimitDialogOpen(false); return }
                  const res = await fetch("/api/stripe/create-portal-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
                  const data = await res.json()
                  if (data?.url) window.location.href = data.url
                } finally {
                  setLimitDialogOpen(false)
                }
              }}>Manage subscription</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarMenu>
  )
}
