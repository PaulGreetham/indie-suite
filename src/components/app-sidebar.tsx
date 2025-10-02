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
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Overview",
          url: "#",
        },
        {
          title: "Analytics",
          url: "#",
        },
      ],
    },
    {
      title: 'Analytics',
      url: '#',
      icon: PieChart,
      items: [
        {
          title: 'Revenue',
          url: '#',
        },
        {
          title: 'Bookings',
          url: '#',
        },
      ],
    },
    {
      title: "Events",
      url: "#",
      icon: Calendar,
      items: [
        {
          title: "All Events",
          url: "#",
        },
        {
          title: "Add Event",
          url: "#",
        },
        {
          title: "Calendar View",
          url: "#",
        },
      ],
    },
    {
      title: "Customers",
      url: "#",
      icon: Users,
      items: [
        {
          title: "All Customers",
          url: "#",
        },
        {
          title: "Add Customer",
          url: "#",
        },
      ],
    },
    {
      title: "Invoices",
      url: "#",
      icon: Receipt,
      items: [
        {
          title: "All Invoices",
          url: "#",
        },
        {
          title: "Create Invoice",
          url: "#",
        },
      ],
    },
    {
      title: "Contracts",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "All Contracts",
          url: "#",
        },
        {
          title: "Contract Templates",
          url: "#",
        },
        {
          title: "Signed Contracts",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
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
