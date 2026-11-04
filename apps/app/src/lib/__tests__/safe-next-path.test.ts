import { describe, expect, it } from "vitest"
import { safeNextPath } from "@/lib/safe-next-path"

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/customers/create")).toBe("/customers/create")
    expect(safeNextPath("/events/all?x=1")).toBe("/events/all?x=1")
  })

  it("rejects anything that could leave the site", () => {
    for (const value of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "customers", "", null, undefined]) {
      expect(safeNextPath(value)).toBeNull()
    }
  })
})
