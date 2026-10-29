import { describe, expect, it } from "vitest"
import { saveErrorMessage } from "../errors"

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
