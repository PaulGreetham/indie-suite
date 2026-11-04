import { describe, expect, it } from "vitest"
import { sidebarNavGroups } from "@/lib/nav"

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
})
