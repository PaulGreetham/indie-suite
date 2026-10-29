import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { getAdminAuthMock, verifyIdTokenMock, getIntegrationMock, ensureWorkspaceMock } = vi.hoisted(() => ({
  getAdminAuthMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
  getIntegrationMock: vi.fn(),
  ensureWorkspaceMock: vi.fn(),
}))

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: getAdminAuthMock,
  getAdminDb: vi.fn(),
}))

vi.mock("@/lib/firma/provisioning", () => ({
  getFirmaIntegrationForBusiness: getIntegrationMock,
  ensureFirmaWorkspaceForBusiness: ensureWorkspaceMock,
}))


const { getBillingMock } = vi.hoisted(() => ({ getBillingMock: vi.fn() }))

vi.mock("@/lib/stripe/billing", () => ({
  getBilling: getBillingMock,
  isLiveSubscriptionStatus: (s: string | null | undefined) => ["active", "trialing", "past_due"].includes(String(s)),
}))

import { GET } from "../templates/status/route"

function call(businessId = "biz-1") {
  return GET(new NextRequest(`http://localhost/api/firma/templates/status?businessId=${businessId}`, {
    headers: { Authorization: "Bearer token" },
  }))
}

describe("firma templates status route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBillingMock.mockResolvedValue({ status: "active" })
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email_verified: true })
    getAdminAuthMock.mockReturnValue({ verifyIdToken: verifyIdTokenMock })
  })

  it("reports not configured without provisioning a workspace (S-03)", async () => {
    getIntegrationMock.mockResolvedValue(null)

    const res = await call()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      configured: false,
      workspaceId: null,
      hasWorkspaceApiKey: false,
      contractTemplateId: null,
      provisioningStatus: null,
    })
    expect(getIntegrationMock).toHaveBeenCalledWith("biz-1", "user-1")
    expect(ensureWorkspaceMock).not.toHaveBeenCalled()
  })

  it("reports an existing integration", async () => {
    getIntegrationMock.mockResolvedValue({ workspaceId: "ws_1", workspaceApiKey: "k", contractTemplateId: "tpl_1", provisioningStatus: "workspace_created" })

    const res = await call()

    await expect(res.json()).resolves.toMatchObject({ configured: true, workspaceId: "ws_1", hasWorkspaceApiKey: true })
    expect(ensureWorkspaceMock).not.toHaveBeenCalled()
  })
})
