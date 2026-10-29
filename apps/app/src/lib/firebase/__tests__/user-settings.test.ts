import { beforeEach, describe, expect, it, vi } from "vitest"

const { getDocMock, currentUser } = vi.hoisted(() => ({
  getDocMock: vi.fn(),
  currentUser: { uid: "user-1" } as { uid: string } | null,
}))

vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(), collection: vi.fn(), serverTimestamp: vi.fn(), getDocs: vi.fn(), orderBy: vi.fn(),
  query: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), where: vi.fn(), limit: vi.fn(),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ path: `${col}/${id}` })),
  getDoc: getDocMock,
}))

vi.mock("../client", () => ({
  getFirestoreDb: () => ({}),
  getFirebaseAuth: () => ({ currentUser }),
}))

import { isOwnBusiness } from "../user-settings"

function snapshot(data: Record<string, unknown> | undefined) {
  return { exists: () => Boolean(data), data: () => data }
}

describe("isOwnBusiness", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("accepts a business owned by the signed-in user and caches the result", async () => {
    getDocMock.mockResolvedValue(snapshot({ ownerId: "user-1" }))
    await expect(isOwnBusiness("biz-own")).resolves.toBe(true)
    await expect(isOwnBusiness("biz-own")).resolves.toBe(true)
    expect(getDocMock).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["a missing business", () => getDocMock.mockResolvedValue(snapshot(undefined))],
    ["another user's business", () => getDocMock.mockResolvedValue(snapshot({ ownerId: "user-2" }))],
    ["a read denied by the rules", () => getDocMock.mockRejectedValue(Object.assign(new Error("denied"), { code: "permission-denied" }))],
  ])("rejects %s", async (_label, arrange) => {
    arrange()
    await expect(isOwnBusiness(`biz-${_label}`)).resolves.toBe(false)
  })

  it("rejects an empty id without reading", async () => {
    await expect(isOwnBusiness("")).resolves.toBe(false)
    expect(getDocMock).not.toHaveBeenCalled()
  })
})
