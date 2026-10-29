import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { initializeAppCheckMock, providerMock } = vi.hoisted(() => ({
  initializeAppCheckMock: vi.fn(),
  providerMock: vi.fn(),
}))

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({ name: "app" })),
  getApps: vi.fn(() => []),
}))
vi.mock("firebase/auth", () => ({ getAuth: vi.fn() }))
vi.mock("firebase/firestore", () => ({ getFirestore: vi.fn() }))
vi.mock("firebase/app-check", () => ({
  initializeAppCheck: initializeAppCheckMock,
  ReCaptchaEnterpriseProvider: class {
    constructor(key: string) { providerMock(key) }
  },
}))

const baseEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "indie-suite.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "indie-suite",
  NEXT_PUBLIC_FIREBASE_APP_ID: "app-id",
}

describe("Firebase client App Check", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    for (const [k, v] of Object.entries(baseEnv)) vi.stubEnv(k, v)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("stays off when no reCAPTCHA site key is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY", "")
    const { getFirebaseApp } = await import("../client")
    getFirebaseApp()
    expect(initializeAppCheckMock).not.toHaveBeenCalled()
  })

  it("starts App Check once with the site key", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY", "site-key-123")
    const { getFirebaseApp } = await import("../client")
    getFirebaseApp()
    getFirebaseApp()
    expect(providerMock).toHaveBeenCalledWith("site-key-123")
    expect(initializeAppCheckMock).toHaveBeenCalledTimes(1)
    expect(initializeAppCheckMock).toHaveBeenCalledWith({ name: "app" }, expect.objectContaining({ isTokenAutoRefreshEnabled: true }))
  })
})
