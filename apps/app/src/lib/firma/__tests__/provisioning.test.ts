import { beforeEach, describe, expect, it, vi } from "vitest"

const { getAdminDbMock, getMock, updateMock } = vi.hoisted(() => ({
  getAdminDbMock: vi.fn(),
  getMock: vi.fn(),
  updateMock: vi.fn(),
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

function mockBusiness(snap: { exists: boolean; data?: Record<string, unknown> }) {
  getMock.mockResolvedValue({ exists: snap.exists, data: () => snap.data })
}

const firma = { workspaceId: "ws_1", workspaceApiKey: "key_1", contractTemplateId: "tpl_1" }

describe("firma provisioning ownership checks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateMock.mockResolvedValue(undefined)
    getAdminDbMock.mockReturnValue({
      collection: vi.fn(() => ({ doc: vi.fn(() => ({ get: getMock, update: updateMock })) })),
    })
  })

  describe("getFirmaIntegrationForBusiness", () => {
    it("returns the integration for the owner", async () => {
      mockBusiness({ exists: true, data: { ownerId: "user-1", firma } })
      await expect(getFirmaIntegrationForBusiness("biz-1", "user-1")).resolves.toMatchObject({ workspaceId: "ws_1" })
    })

    it("returns null when the business does not exist", async () => {
      mockBusiness({ exists: false })
      await expect(getFirmaIntegrationForBusiness("biz-1", "user-1")).resolves.toBeNull()
    })

    it("rejects another user's business with 404", async () => {
      mockBusiness({ exists: true, data: { ownerId: "user-2", firma } })
      await expect(getFirmaIntegrationForBusiness("biz-1", "user-1")).rejects.toMatchObject({ status: 404, code: "not_found" })
    })

    it("fails closed when ownerId is missing", async () => {
      mockBusiness({ exists: true, data: { firma } })
      await expect(getFirmaIntegrationForBusiness("biz-1", "user-1")).rejects.toMatchObject({ status: 404 })
    })
  })

  describe("ensureFirmaWorkspaceForBusiness", () => {
    it("returns the existing integration for the owner", async () => {
      mockBusiness({ exists: true, data: { ownerId: "user-1", firma } })
      await expect(ensureFirmaWorkspaceForBusiness("biz-1", "user-1")).resolves.toMatchObject({ workspaceId: "ws_1" })
    })

    it.each([
      ["missing business", { exists: false }],
      ["another user's business", { exists: true, data: { ownerId: "user-2", firma } }],
      ["business with no ownerId", { exists: true, data: { firma } }],
    ])("rejects a %s with 404 without writing", async (_label, snap) => {
      mockBusiness(snap)
      await expect(ensureFirmaWorkspaceForBusiness("biz-1", "user-1")).rejects.toMatchObject({ status: 404 })
      expect(updateMock).not.toHaveBeenCalled()
    })
  })

  describe("saveFirmaContractTemplateForBusiness", () => {
    it("saves the template id for the owner", async () => {
      mockBusiness({ exists: true, data: { ownerId: "user-1" } })
      await saveFirmaContractTemplateForBusiness("biz-1", "user-1", "tpl_2")
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ "firma.contractTemplateId": "tpl_2" }))
    })

    it.each([
      ["missing business", { exists: false }],
      ["another user's business", { exists: true, data: { ownerId: "user-2" } }],
      ["business with no ownerId", { exists: true, data: {} }],
    ])("rejects a %s with 404 without writing", async (_label, snap) => {
      mockBusiness(snap)
      await expect(saveFirmaContractTemplateForBusiness("biz-1", "user-1", "tpl_2")).rejects.toMatchObject({ status: 404 })
      expect(updateMock).not.toHaveBeenCalled()
    })
  })
})
