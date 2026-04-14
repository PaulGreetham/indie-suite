import { beforeEach, describe, expect, it, vi } from "vitest"

const { getFirmaClientMock, listTemplatesMock } = vi.hoisted(() => ({
  getFirmaClientMock: vi.fn(),
  listTemplatesMock: vi.fn(),
}))

vi.mock("@/lib/firma/server", () => ({
  getFirmaClient: getFirmaClientMock,
}))

import { GET } from "../templates/route"

describe("firma templates route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getFirmaClientMock.mockReturnValue({
      listTemplates: listTemplatesMock,
    })
  })

  it("returns templates when the Firma request succeeds", async () => {
    listTemplatesMock.mockResolvedValue([{ id: "tpl_1", name: "Standard contract" }])

    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([
      { id: "tpl_1", name: "Standard contract" },
    ])
  })

  it("returns 500 when template loading fails", async () => {
    listTemplatesMock.mockRejectedValue(new Error("boom"))

    const response = await GET()

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "list_failed" })
  })
})
