import { afterEach, describe, expect, it, vi } from "vitest"
import { FirmaClient } from "../server"

describe("FirmaClient", () => {
  afterEach(() => {
    delete process.env.FIRMA_API_KEY
    delete process.env.FIRMA_WORKSPACE_API_KEY
    vi.unstubAllGlobals()
  })

  it("normalizes document_url from create responses into url and firmaUrl", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "sr_1", document_url: "https://app.firma.dev/sr_1" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const client = new FirmaClient({ apiKey: "secret" })
    const response = await client.createSigningRequestFromTemplate("tpl_1", {
      name: "Contract",
      recipients: [{
        first_name: "Ada",
        last_name: "Lovelace",
        email: "ada@example.com",
        designation: "Signer",
        order: 1,
      }],
    })

    expect(response).toMatchObject({
      id: "sr_1",
      document_url: "https://app.firma.dev/sr_1",
      url: "https://app.firma.dev/sr_1",
      firmaUrl: "https://app.firma.dev/sr_1",
    })
  })

  it("uses the company FIRMA_API_KEY and ignores a stray FIRMA_WORKSPACE_API_KEY", async () => {
    process.env.FIRMA_API_KEY = "company-key"
    process.env.FIRMA_WORKSPACE_API_KEY = "workspace-key"
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    })
    vi.stubGlobal("fetch", fetchMock)

    await new FirmaClient().listTemplates()

    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer company-key", "x-api-key": "company-key" }),
    }))
  })

  it("uses an explicitly passed workspace key", async () => {
    process.env.FIRMA_API_KEY = "company-key"
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })
    vi.stubGlobal("fetch", fetchMock)

    await new FirmaClient({ apiKey: "ws-key" }).listTemplates()

    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer ws-key" }),
    }))
  })
})
