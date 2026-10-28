import { describe, expect, it, vi } from "vitest"

vi.mock("@sparticuz/chromium", () => ({ default: {} }))
vi.mock("puppeteer-core", () => ({ default: { launch: vi.fn() } }))
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: vi.fn() }))
vi.mock("@/components/pdf/InvoicePdf", () => ({ InvoicePdf: () => null }))

import { pdfResponse, safePdfFilename } from "../render"

describe("safePdfFilename", () => {
  it("keeps safe invoice numbers", () => {
    expect(safePdfFilename("INV-001", "invoice")).toBe("INV-001.pdf")
  })

  it("strips header-breaking and path characters", () => {
    expect(safePdfFilename('INV 1"; x=\r\nSet-Cookie: a=b/../', "invoice")).toBe("INV-1-x-Set-Cookie-a-b.pdf")
  })

  it("falls back when nothing safe remains", () => {
    expect(safePdfFilename(undefined, "receipt")).toBe("receipt.pdf")
    expect(safePdfFilename("\"/\\", "receipt")).toBe("receipt.pdf")
  })

  it("caps the length", () => {
    expect(safePdfFilename("a".repeat(300), "invoice")).toBe(`${"a".repeat(100)}.pdf`)
  })
})

describe("pdfResponse", () => {
  it("sets a quoted attachment filename and disables caching", () => {
    const res = pdfResponse(new Uint8Array([1, 2, 3]), "INV-001.pdf")
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="INV-001.pdf"')
    expect(res.headers.get("Cache-Control")).toBe("private, no-store")
  })
})
