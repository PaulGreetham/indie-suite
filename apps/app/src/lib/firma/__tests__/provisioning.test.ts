import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { getAdminDbMock, createWorkspaceMock, getWorkspaceMock, listWorkspacesMock } = vi.hoisted(() => ({
  getAdminDbMock: vi.fn(),
  createWorkspaceMock: vi.fn(),
  getWorkspaceMock: vi.fn(),
  listWorkspacesMock: vi.fn(),
}))

vi.mock("../server", () => ({
  FirmaClient: class {
    createWorkspace = createWorkspaceMock
    getWorkspace = getWorkspaceMock
    listWorkspaces = listWorkspacesMock
  },
}))

vi.mock("@/lib/firebase/admin", () => ({
  AdminFieldValue: { serverTimestamp: () => "server-timestamp" },
  getAdminDb: getAdminDbMock,
}))

import {
  ensureFirmaWorkspaceForBusiness,
  getFirmaIntegrationForBusiness,
  saveFirmaContractTemplateForBusiness,
} from "../provisioning"

type Store = Record<string, Record<string, Record<string, unknown> | undefined>>

// Admin Firestore fake backed by an in-memory store; records writes per collection
function mockDb(store: Store) {
  const writes: Array<{ collection: string; id: string; op: string; data: unknown; options?: unknown }> = []
  getAdminDbMock.mockReturnValue({
    collection: vi.fn((collection: string) => ({
      doc: vi.fn((id: string) => ({
        get: vi.fn(async () => {
          const data = store[collection]?.[id]
          return { exists: Boolean(data), id, data: () => data }
        }),
        set: vi.fn(async (data: unknown, options?: unknown) => { writes.push({ collection, id, op: "set", data, options }) }),
        update: vi.fn(async (data: unknown) => { writes.push({ collection, id, op: "update", data }) }),
      })),
    })),
  })
  return writes
}

const integration = { workspaceId: "ws_1", workspaceApiKey: "key_1", contractTemplateId: "tpl_1" }
const ownBusiness = { ownerId: "user-1", name: "Acme Music" }

describe("firma provisioning", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getFirmaIntegrationForBusiness", () => {
    it("returns the integration from integrations_firma for the owner", async () => {
      mockDb({ settings_trading_details: { "biz-1": ownBusiness }, integrations_firma: { "biz-1": integration } })
      await expect(getFirmaIntegrationForBusiness("biz-1", "user-1")).resolves.toMatchObject({ workspaceId: "ws_1", workspaceApiKey: "key_1" })
    })

    it("ignores the legacy client-writable firma field on the business (R-17b)", async () => {
      mockDb({ settings_trading_details: { "biz-1": { ...ownBusiness, firma: { workspaceId: "ws_victim", workspaceApiKey: "stolen" } } } })
      await expect(getFirmaIntegrationForBusiness("biz-1", "user-1")).resolves.toBeNull()
    })

    it("returns null when the business does not exist", async () => {
      mockDb({ integrations_firma: { "biz-1": integration } })
      await expect(getFirmaIntegrationForBusiness("biz-1", "user-1")).resolves.toBeNull()
    })

    it.each([
      ["another user's business", { ownerId: "user-2" }],
      ["a business with no ownerId", { name: "x" }],
    ])("rejects %s with 404", async (_label, business) => {
      mockDb({ settings_trading_details: { "biz-1": business }, integrations_firma: { "biz-1": integration } })
      await expect(getFirmaIntegrationForBusiness("biz-1", "user-1")).rejects.toMatchObject({ status: 404, code: "not_found" })
    })
  })

  describe("ensureFirmaWorkspaceForBusiness", () => {
    afterEach(() => {
      delete process.env.FIRMA_API_KEY
    })

    it("returns the existing integration for the owner without writing", async () => {
      const writes = mockDb({ settings_trading_details: { "biz-1": ownBusiness }, integrations_firma: { "biz-1": integration } })
      await expect(ensureFirmaWorkspaceForBusiness("biz-1", "user-1")).resolves.toMatchObject({ workspaceId: "ws_1" })
      expect(writes).toEqual([])
    })

    it.each([
      ["missing business", {}],
      ["another user's business", { "biz-1": { ownerId: "user-2" } }],
      ["business with no ownerId", { "biz-1": { name: "x" } }],
    ])("rejects a %s with 404 without writing", async (_label, businesses) => {
      const writes = mockDb({ settings_trading_details: businesses, integrations_firma: { "biz-1": integration } })
      await expect(ensureFirmaWorkspaceForBusiness("biz-1", "user-1")).rejects.toMatchObject({ status: 404 })
      expect(writes).toEqual([])
    })

    it("refreshes a missing workspace key into integrations_firma only", async () => {
      process.env.FIRMA_API_KEY = "company-key"
      getWorkspaceMock.mockResolvedValue({ id: "ws_1", api_key: "key_new" })
      const writes = mockDb({ settings_trading_details: { "biz-1": ownBusiness }, integrations_firma: { "biz-1": { workspaceId: "ws_1" } } })

      await expect(ensureFirmaWorkspaceForBusiness("biz-1", "user-1")).resolves.toMatchObject({ workspaceApiKey: "key_new" })
      expect(writes).toEqual([
        expect.objectContaining({ collection: "integrations_firma", id: "biz-1", op: "update", data: expect.objectContaining({ workspaceApiKey: "key_new" }) }),
      ])
    })

    it("creates a new workspace named with the businessId, never matches by name, and stores it server-only (R-17)", async () => {
      process.env.FIRMA_API_KEY = "company-key"
      createWorkspaceMock.mockResolvedValue({ id: "ws_new" })
      getWorkspaceMock.mockResolvedValue({ id: "ws_new", api_key: "key_new" })
      listWorkspacesMock.mockResolvedValue({ results: [{ id: "ws_victim", name: "Acme Music Workspace" }] })
      const writes = mockDb({ settings_trading_details: { "biz-1": { ...ownBusiness, firma: { workspaceId: "ws_victim" } } } })

      const result = await ensureFirmaWorkspaceForBusiness("biz-1", "user-1")

      expect(listWorkspacesMock).not.toHaveBeenCalled()
      expect(getWorkspaceMock).not.toHaveBeenCalledWith("ws_victim")
      expect(createWorkspaceMock).toHaveBeenCalledWith("Acme Music (biz-1)")
      expect(result).toMatchObject({ workspaceId: "ws_new", workspaceApiKey: "key_new" })
      expect(writes).toHaveLength(1)
      expect(writes[0]).toMatchObject({ collection: "integrations_firma", id: "biz-1", op: "set" })
      expect(writes[0].data).toMatchObject({ workspaceId: "ws_new", workspaceApiKey: "key_new", businessId: "biz-1" })
      expect(writes[0].data).not.toHaveProperty("ownerId")
    })
  })

  describe("saveFirmaContractTemplateForBusiness", () => {
    it("merges the template id into integrations_firma for the owner", async () => {
      const writes = mockDb({ settings_trading_details: { "biz-1": ownBusiness } })
      await saveFirmaContractTemplateForBusiness("biz-1", "user-1", "tpl_2")
      expect(writes).toEqual([
        expect.objectContaining({
          collection: "integrations_firma",
          id: "biz-1",
          op: "set",
          data: expect.objectContaining({ contractTemplateId: "tpl_2", businessId: "biz-1" }),
          options: { merge: true },
        }),
      ])
    })

    it.each([
      ["missing business", {}],
      ["another user's business", { "biz-1": { ownerId: "user-2" } }],
      ["business with no ownerId", { "biz-1": {} }],
    ])("rejects a %s with 404 without writing", async (_label, businesses) => {
      const writes = mockDb({ settings_trading_details: businesses })
      await expect(saveFirmaContractTemplateForBusiness("biz-1", "user-1", "tpl_2")).rejects.toMatchObject({ status: 404 })
      expect(writes).toEqual([])
    })
  })
})
