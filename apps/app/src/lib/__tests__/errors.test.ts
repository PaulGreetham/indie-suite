import { describe, expect, it } from "vitest"
import { actionErrorMessage, saveErrorMessage } from "../errors"

describe("saveErrorMessage", () => {
  it.each([
    [{ code: "permission-denied", message: "Missing or insufficient permissions." }, "You don't have access to that. Reload the page and try again."],
    [new Error("BUSINESS_REQUIRED"), "Create or select a business first."],
    [new Error("AUTH_REQUIRED"), "Please sign in again."],
    [new Error("boom"), "Couldn't save. Please try again."],
    [null, "Couldn't save. Please try again."],
  ])("maps %j", (err, message) => {
    expect(saveErrorMessage(err)).toBe(message)
  })
})

describe("actionErrorMessage (UI-F06)", () => {
  it("uses the action's own fallback for unknown errors", () => {
    expect(actionErrorMessage(new Error("boom"), "Couldn't delete the customer. Please try again.")).toBe(
      "Couldn't delete the customer. Please try again."
    )
  })

  it.each([
    [new TypeError("Failed to fetch"), "Couldn't reach IndieSuite. Check your connection and try again."],
    [new TypeError("Load failed"), "Couldn't reach IndieSuite. Check your connection and try again."],
    [new Error("INVOICE_NUMBER_NOT_UNIQUE"), "That invoice number is already used. Use a different number."],
    [new Error("rate_limited"), "Too many requests. Wait a minute and try again."],
  ])("maps %s", (err, message) => {
    expect(actionErrorMessage(err, "fallback")).toBe(message)
  })

  it("doesn't treat unrelated TypeErrors as network failures", () => {
    expect(actionErrorMessage(new TypeError("x is undefined"), "fallback")).toBe("fallback")
  })
})
