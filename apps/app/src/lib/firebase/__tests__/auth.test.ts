import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { signOutMock, sendEmailVerificationMock, createUserMock, updateProfileMock } = vi.hoisted(() => ({
  signOutMock: vi.fn(),
  sendEmailVerificationMock: vi.fn(),
  createUserMock: vi.fn(),
  updateProfileMock: vi.fn(),
}))

vi.mock("firebase/auth", () => ({
  signOut: signOutMock,
  sendEmailVerification: sendEmailVerificationMock,
  createUserWithEmailAndPassword: createUserMock,
  updateProfile: updateProfileMock,
}))
vi.mock("@/lib/firebase/client", () => ({ getFirebaseAuth: () => ({}) }))

import { emailPasswordSignUp, sendVerificationEmail, signOutUser } from "../auth"

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
    sendEmailVerificationMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("links the email back to the app with the chosen plan on the app's own origin (SU-06)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", window.location.origin)
    await sendVerificationEmail(user, "/signup/verified?plan=pro&interval=yearly")
    expect(sendEmailVerificationMock).toHaveBeenCalledTimes(1)
    expect(sendEmailVerificationMock).toHaveBeenCalledWith(user, {
      url: `${window.location.origin}/signup/verified?plan=pro&interval=yearly`,
    })
  })

  it("sends the plain email on any other origin, since Firebase rejects unauthorised continue URLs", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.indiesuite.app")
    await sendVerificationEmail(user)
    expect(sendEmailVerificationMock).toHaveBeenCalledTimes(1)
    expect(sendEmailVerificationMock).toHaveBeenCalledWith(user)
  })

  it("sends the plain email when no app URL is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "")
    await sendVerificationEmail(user)
    expect(sendEmailVerificationMock).toHaveBeenCalledWith(user)
  })
})

describe("emailPasswordSignUp", () => {
  const user = { uid: "user-1" }

  beforeEach(() => {
    vi.clearAllMocks()
    createUserMock.mockResolvedValue({ user })
  })

  it("saves the full name as the display name (SU-10)", async () => {
    updateProfileMock.mockResolvedValue(undefined)
    await emailPasswordSignUp("ada@example.com", "secret", "  Ada Lovelace ")
    expect(updateProfileMock).toHaveBeenCalledWith(user, { displayName: "Ada Lovelace" })
  })

  it("skips the profile update without a name and never fails the sign-up because of it", async () => {
    await emailPasswordSignUp("ada@example.com", "secret")
    expect(updateProfileMock).not.toHaveBeenCalled()

    updateProfileMock.mockRejectedValue(new Error("network"))
    await expect(emailPasswordSignUp("ada@example.com", "secret", "Ada")).resolves.toEqual({ user })
  })
})
