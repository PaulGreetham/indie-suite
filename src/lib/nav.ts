import { BookOpen, Calendar, PieChart, Receipt, Settings2, SquareTerminal, Users, Building2 } from "lucide-react"

export type NavItem = {
  title: string
  url: string
  icon?: React.ComponentType<{ className?: string }>
  isActive?: boolean
  items?: { title: string; url: string }[]
}

export const navMain: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: SquareTerminal,
    items: [
      { title: "Overview", url: "/dashboard/overview" },
      { title: "Analytics", url: "/dashboard/analytics" },
    ],
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: PieChart,
    items: [
      { title: "Revenue", url: "/analytics/revenue" },
      { title: "Bookings", url: "/analytics/bookings" },
    ],
  },
  {
    title: "Events",
    url: "/events",
    icon: Calendar,
    items: [
      { title: "All Events", url: "/events/all" },
      { title: "Create Event", url: "/events/create" },
      { title: "Calendar View", url: "/events/calendar" },
    ],
  },
  {
    title: "Customers",
    url: "/customers",
    icon: Users,
    items: [
      { title: "All Customers", url: "/customers/all" },
      { title: "Create Customer", url: "/customers/create" },
    ],
  },
  {
    title: "Venues",
    url: "/venues",
    icon: Building2,
    items: [
      { title: "All Venues", url: "/venues/all" },
      { title: "Create Venue", url: "/venues/create" },
    ],
  },
  {
    title: "Invoices",
    url: "/invoices",
    icon: Receipt,
    items: [
      { title: "All Invoices", url: "/invoices/all" },
      { title: "Create Invoice", url: "/invoices/create" },
    ],
  },
  {
    title: "Contracts",
    url: "/contracts",
    icon: BookOpen,
    items: [
      { title: "All Contracts", url: "/contracts/all" },
      { title: "Contract Templates", url: "/contracts/templates" },
      { title: "Signed Contracts", url: "/contracts/signed" },
    ],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings2,
    items: [
      { title: "General", url: "/settings/general" },
      { title: "Addresses", url: "/settings/addresses" },
      { title: "Bank Accounts", url: "/settings/bank-accounts" },
      { title: "Team", url: "/settings/team" },
      { title: "Billing", url: "/settings/billing" },
      { title: "Limits", url: "/settings/limits" },
    ],
  },
]


