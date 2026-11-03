import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { getIdTokenMock, currentUser } = vi.hoisted(() => {
  const getIdTokenMock = vi.fn()
  return { getIdTokenMock, currentUser: { value: { getIdToken: getIdTokenMock } as unknown } }
})

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => ({ currentUser: currentUser.value }),
}))

import { fetchSubscription } from "../billing-client"

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status })
}

describe("billing client", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    currentUser.value = { getIdToken: getIdTokenMock }
    getIdTokenMock.mockImplementation(async (force?: boolean) => (force ? "fresh-token" : "cached-token"))
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("refreshes a token issued before email verification and retries once (SU-05)", async () => {
    fetchMock
      .mockResolvedValueOnce(json(403, { error: "email_unverified" }))
      .mockResolvedValueOnce(json(200, { active: true }))

    await expect(fetchSubscription()).resolves.toEqual({ active: true })

    expect(getIdTokenMock).toHaveBeenLastCalledWith(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer fresh-token")
  })

  it("doesn't retry other errors", async () => {
    fetchMock.mockResolvedValueOnce(json(403, { error: "forbidden" }))

    await expect(fetchSubscription()).resolves.toBeNull()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("throws AUTH_REQUIRED when nobody is signed in", async () => {
    currentUser.value = null
    await expect(fetchSubscription()).rejects.toThrow("AUTH_REQUIRED")
  })
})
