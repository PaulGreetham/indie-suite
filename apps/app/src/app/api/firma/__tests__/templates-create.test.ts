// @vitest-environment node
// FormData uploads with File bodies need Node's fetch implementation rather than jsdom's
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { requireActiveUserMock, ensureWorkspaceMock, saveTemplateMock, createTemplateMock } = vi.hoisted(() => ({
  requireActiveUserMock: vi.fn(),
  ensureWorkspaceMock: vi.fn(),
  saveTemplateMock: vi.fn(),
  createTemplateMock: vi.fn(),
}))

vi.mock("@/lib/server/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/auth")>()),
  requireActiveUser: requireActiveUserMock,
}))

vi.mock("@/lib/firma/provisioning", () => ({
  ensureFirmaWorkspaceForBusiness: ensureWorkspaceMock,
  saveFirmaContractTemplateForBusiness: saveTemplateMock,
}))

vi.mock("@/lib/firma/server", () => ({
  FirmaClient: class {
    createTemplate = createTemplateMock
  },
}))

vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: vi.fn(async () => Buffer.from("%PDF-1.7 starter")) }))
vi.mock("@/components/pdf/ContractStarterTemplatePdf", () => ({ ContractStarterTemplatePdf: () => null }))

import { POST } from "../templates/create/route"

function upload(file: File | null, extra: Record<string, string> = {}) {
  const form = new FormData()
  form.set("businessId", "biz-1")
  form.set("name", "My contract")
  if (file) form.set("document", file)
  for (const [k, v] of Object.entries(extra)) form.set(k, v)
  return new NextRequest("http://localhost/api/firma/templates/create", { method: "POST", body: form })
}

const pdf = (content = "%PDF-1.7\n...", type = "application/pdf") => new File([content], "contract.pdf", { type })

describe("firma templates create route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireActiveUserMock.mockResolvedValue({ uid: "user-1" })
    ensureWorkspaceMock.mockResolvedValue({ workspaceId: "ws_1", workspaceApiKey: "key" })
    createTemplateMock.mockResolvedValue({ id: "tpl_1" })
    saveTemplateMock.mockResolvedValue(undefined)
  })

  it("uploads a valid PDF", async () => {
    const res = await POST(upload(pdf()))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ contractTemplateId: "tpl_1" })
    expect(createTemplateMock).toHaveBeenCalledWith(expect.objectContaining({ name: "My contract" }))
  })

  it.each([
    ["a missing content type", pdf("%PDF-1.7", ""), "invalid_document_type"],
    ["a non-PDF type", pdf("%PDF-1.7", "text/html"), "invalid_document_type"],
    ["a PDF type with non-PDF content", pdf("<html><script>alert(1)</script>"), "invalid_document_type"],
    ["a file over 4 MB", pdf("%PDF-" + "x".repeat(4 * 1024 * 1024)), "document_too_large"],
  ])("rejects %s before provisioning a workspace", async (_label, file, error) => {
    const res = await POST(upload(file))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error })
    expect(ensureWorkspaceMock).not.toHaveBeenCalled()
    expect(createTemplateMock).not.toHaveBeenCalled()
  })

  it("still accepts a starter template without an upload", async () => {
    const res = await POST(upload(null, { templateKey: "starter-service-agreement" }))
    expect(res.status).toBe(200)
    expect(ensureWorkspaceMock).toHaveBeenCalledWith("biz-1", "user-1")
  })

  it("caps the template name length", async () => {
    await POST(upload(pdf(), { name: "n".repeat(500) }))
    expect(createTemplateMock.mock.calls[0][0].name).toHaveLength(200)
  })
})
