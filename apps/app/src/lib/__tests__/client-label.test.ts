import { describe, expect, it } from "vitest"
import { clientLabel } from "@/lib/client-label"

describe("clientLabel", () => {
  it("uses the business name when there is one", () => {
    expect(clientLabel({ company: "Acme Events", fullName: "Barry X" })).toBe("Acme Events")
  })

  it("falls back to the contact name", () => {
    expect(clientLabel({ company: null, fullName: "Barry X" })).toBe("Barry X")
    expect(clientLabel({ company: "  ", fullName: "Barry X" })).toBe("Barry X")
  })

  it("never returns an empty label", () => {
    expect(clientLabel({})).toBe("Unnamed client")
  })
})
