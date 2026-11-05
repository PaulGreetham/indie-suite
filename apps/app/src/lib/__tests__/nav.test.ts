import { describe, expect, it } from "vitest"
import { navMain, sidebarNavGroups } from "@/lib/nav"

describe("sidebarNavGroups", () => {
  it("lists operations in workflow order (UI-F08)", () => {
    const operations = sidebarNavGroups.find((group) => group.label === "Operations")
    expect(operations?.items.map((item) => item.title)).toEqual([
      "Customers",
      "Venues",
      "Events",
      "Invoices",
      "Contracts",
    ])
  })

  it("links to Receipts under Invoices (UI-F04)", () => {
    const invoices = navMain.find((item) => item.title === "Invoices")
    expect(invoices?.items?.map((item) => item.url)).toContain("/invoices/receipts")
  })
})
