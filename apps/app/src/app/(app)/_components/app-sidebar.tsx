"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/firebase/auth-context"
import { getFirestoreDb } from "@/lib/firebase/client"
import { sidebarNavGroups } from "@/lib/nav"
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const [contactName, setContactName] = React.useState<string | null>(null)
  React.useEffect(() => {
    async function loadContactName() {
      const uid = user?.uid
      if (!uid) return
      const db = getFirestoreDb()
      const q = query(
        collection(db, "settings_trading_details"),
        where("ownerId", "==", uid),
        orderBy("createdAt", "desc"),
        limit(1),
      )
      try {
        const snap = await getDocs(q)
        const data = snap.docs[0]?.data() as { contactName?: unknown } | undefined
        const name = typeof data?.contactName === "string" && data.contactName.trim() ? String(data.contactName) : null
        if (name) setContactName(name)
      } catch {
        // ignore
      }
    }
    loadContactName().catch(() => void 0)
  }, [user?.uid])
  const displayName = contactName || user?.displayName || user?.email?.split("@")[0] || "User"
  const email = user?.email || ""

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={[]} />
      </SidebarHeader>
      <SidebarContent>
        {sidebarNavGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: displayName, email, avatar: user?.photoURL || "" }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
