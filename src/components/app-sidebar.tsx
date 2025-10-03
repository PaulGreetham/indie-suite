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

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
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
  navMain: [
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
          title: "Analytics",
          url: "/dashboard/analytics",
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
          title: "Add Event",
          url: "/events/add",
        },
        {
          title: "Calendar View",
          url: "/events/calendar",
        },
      ],
    },
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
        },
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
          title: "Contract Templates",
          url: "/contracts/templates",
        },
        {
          title: "Signed Contracts",
          url: "/contracts/signed",
        },
      ],
    },
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
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
