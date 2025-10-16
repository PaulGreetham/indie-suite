"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Calendar,
  Command,
  GalleryVerticalEnd,
  PieChart,
  Receipt,
  Settings2,
  SquareTerminal,
  Users,
  Building2,
  User,
} from "lucide-react"

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
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore"

// This is sample data.
const data = {
  // user is provided at runtime from Firebase auth; see below
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  overview: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: SquareTerminal,
      items: [
        {
          title: "Overview",
          url: "/dashboard/overview",
        },
        {
          title: "Notification Feed",
          url: "/dashboard/notifications",
        },
      ],
    },
    {
      title: 'Analytics',
      url: '/analytics',
      icon: PieChart,
      items: [
        {
          title: 'Revenue',
          url: '/analytics/revenue',
        },
        {
          title: 'Bookings',
          url: '/analytics/bookings',
        },
      ],
    },
  ],
  operations: [
    {
      title: "Customers",
      url: "/customers",
      icon: Users,
      items: [
        {
          title: "All Customers",
          url: "/customers/all",
        },
        {
          title: "Create Customer",
          url: "/customers/create",
        },
      ],
    },
    {
      title: "Venues",
      url: "/venues",
      icon: Building2,
      items: [
        {
          title: "All Venues",
          url: "/venues/all",
        },
        {
          title: "Create Venue",
          url: "/venues/create",
        },
      ],
    },
    {
      title: "Events",
      url: "/events",
      icon: Calendar,
      items: [
        {
          title: "All Events",
          url: "/events/all",
        },
        {
          title: "Create Event",
          url: "/events/create",
        },
        {
          title: "Calendar View",
          url: "/events/calendar",
        },
      ],
    },
    {
      title: "Invoices",
      url: "/invoices",
      icon: Receipt,
      items: [
        {
          title: "All Invoices",
          url: "/invoices/all",
        },
        {
          title: "Create Invoice",
          url: "/invoices/create",
        }
      ],
    },
    {
      title: "Contracts",
      url: "/contracts",
      icon: BookOpen,
      items: [
        {
          title: "All Contracts",
          url: "/contracts/all",
        },
        {
          title: "Create Contract",
          url: "/contracts/create",
        },
      ],
    },
  ],
  accounts: [
    {
      title: "Account Details",
      url: "/settings/subscriptions",
      icon: User,
      items: [
        {
          title: "Trading Details",
          url: "/settings/trading-details",
        },
        {
          title: "Bank Accounts",
          url: "/settings/bank-accounts",
        },
        {
          title: "Subscriptions",
          url: "/settings/subscriptions",
        },
      ],
    },
  ],
  preferences: [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "/settings/general",
        },

        {
          title: "Team",
          url: "/settings/team",
        },
        {
          title: "Billing",
          url: "/settings/billing",
        },
        {
          title: "Limits",
          url: "/settings/limits",
        },
      ],
    },
  ],
}

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
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Overview" items={data.overview} />
        <NavMain label="Operations" items={data.operations} />
        <NavMain label="Accounts" items={data.accounts} />
        <NavMain label="Preferences" items={data.preferences} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: displayName, email, avatar: user?.photoURL || "" }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
