import { beforeEach, describe, expect, it, vi } from "vitest"

const { signOutMock } = vi.hoisted(() => ({ signOutMock: vi.fn() }))

vi.mock("firebase/auth", () => ({ signOut: signOutMock }))
vi.mock("@/lib/firebase/client", () => ({ getFirebaseAuth: () => ({}) }))

import { signOutUser } from "../auth"

describe("signOutUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signOutMock.mockResolvedValue(undefined)
  })

  it("clears per-user values from both storages but keeps UI flags (S-07)", async () => {
    for (const storage of [window.sessionStorage, window.localStorage]) {
      storage.setItem("activeBusinessId", "biz-1")
      storage.setItem("activeBusinessName", "Acme")
      storage.setItem("businessName", "Acme")
      storage.setItem("subscriptionPlan", "Pro")
    }
    window.localStorage.setItem("introShown", "1")

    await signOutUser()

    for (const storage of [window.sessionStorage, window.localStorage]) {
      for (const key of ["activeBusinessId", "activeBusinessName", "businessName", "subscriptionPlan"]) {
        expect(storage.getItem(key)).toBeNull()
      }
    }
    expect(window.localStorage.getItem("introShown")).toBe("1")
    expect(signOutMock).toHaveBeenCalled()
  })
})
