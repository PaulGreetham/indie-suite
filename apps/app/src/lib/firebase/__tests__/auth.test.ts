import { beforeEach, describe, expect, it, vi } from "vitest"

const { signOutMock, sendEmailVerificationMock } = vi.hoisted(() => ({ signOutMock: vi.fn(), sendEmailVerificationMock: vi.fn() }))

vi.mock("firebase/auth", () => ({ signOut: signOutMock, sendEmailVerification: sendEmailVerificationMock }))
vi.mock("@/lib/firebase/client", () => ({ getFirebaseAuth: () => ({}) }))

import { sendVerificationEmail, signOutUser } from "../auth"

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

describe("sendVerificationEmail", () => {
  const user = { uid: "user-1" } as never

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("links the email back to the app with the chosen plan (SU-06)", async () => {
    sendEmailVerificationMock.mockResolvedValue(undefined)
    await sendVerificationEmail(user, "/signup/verified?plan=pro&interval=yearly")
    expect(sendEmailVerificationMock).toHaveBeenCalledWith(user, {
      url: `${window.location.origin}/signup/verified?plan=pro&interval=yearly`,
    })
  })

  it("falls back to Firebase's default link if the continue URL is rejected", async () => {
    sendEmailVerificationMock.mockRejectedValueOnce(new Error("auth/unauthorized-continue-uri")).mockResolvedValueOnce(undefined)
    await sendVerificationEmail(user)
    expect(sendEmailVerificationMock).toHaveBeenCalledTimes(2)
    expect(sendEmailVerificationMock).toHaveBeenLastCalledWith(user)
  })
})
