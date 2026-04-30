import { beforeEach, describe, expect, it, vi } from "vitest"

const { getFirmaClientMock, createSigningRequestMock, getTemplateMock, listTemplatesMock } = vi.hoisted(() => ({
  getFirmaClientMock: vi.fn(),
  createSigningRequestMock: vi.fn(),
  getTemplateMock: vi.fn(),
  listTemplatesMock: vi.fn(),
}))

vi.mock("@/lib/firma/server", () => ({
  getFirmaClient: getFirmaClientMock,
}))

import { POST } from "../generate/route"

function request(body: unknown): Request {
  return new Request("http://localhost/api/contracts/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("contracts generate route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    delete process.env.FIREBASE_PROJECT_ID
    delete process.env.FIREBASE_CLIENT_EMAIL
    delete process.env.FIREBASE_PRIVATE_KEY
    process.env.FIRMA_TEMPLATE_ID = "tpl_contract"
    getFirmaClientMock.mockReturnValue({
      createSigningRequestFromTemplate: createSigningRequestMock,
      getTemplate: getTemplateMock,
      listTemplates: listTemplatesMock,
    })
    getTemplateMock.mockResolvedValue({
      id: "tpl_contract",
      recipients: [{ id: "template-user-1", designation: "Signer", order: 1 }],
    })
    createSigningRequestMock.mockResolvedValue({
      id: "sr_1",
      url: "https://app.firma.dev/sr_1",
    })
  })

  it("returns a clear error when the customer has no email", async () => {
    const response = await POST(request({
      eventId: "event-1",
      data: {
        event: { title: "Launch Party", customerId: "customer-1" },
        customer: { fullName: "Ada Lovelace" },
      },
    }) as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "missing_recipient_email" })
    expect(createSigningRequestMock).not.toHaveBeenCalled()
  })

  it("creates a Firma request with recipients and flat field overrides", async () => {
    const response = await POST(request({
      eventId: "event-1",
      terms: [{ text: "50% deposit due on booking" }],
      notes: "Use main hall entrance",
      data: {
        event: {
          title: "Launch Party",
          customerId: "customer-1",
          venueId: "venue-1",
          businessId: "business-1",
          startsAt: "2026-05-01T18:00:00.000Z",
        },
        customer: { fullName: "Ada Lovelace", email: "ada@example.com", company: "Analytical Engines Ltd" },
        venue: { name: "Town Hall" },
        invoice: { invoiceNumber: "INV-001", total: 1200 },
        invoiceId: "invoice-1",
      },
    }) as never)

    expect(response.status).toBe(200)
    expect(createSigningRequestMock).toHaveBeenCalledWith("tpl_contract", expect.objectContaining({
      name: "Contract - Launch Party",
      recipients: [{
        template_user_id: "template-user-1",
        first_name: "Ada",
        last_name: "Lovelace",
        email: "ada@example.com",
        designation: "Signer",
        order: 1,
        company: "Analytical Engines Ltd",
        custom_fields: expect.objectContaining({
          event_title: "Launch Party",
          customer_email: "ada@example.com",
          venue_name: "Town Hall",
          invoice_number: "INV-001",
          contract_terms: "50% deposit due on booking",
          contract_notes: "Use main hall entrance",
        }),
      }],
      fields: expect.arrayContaining([
        { variable_name: "event_title", read_only: true, read_only_value: "Launch Party" },
        { variable_name: "customer_email", read_only: true, read_only_value: "ada@example.com" },
        { variable_name: "contract_terms", read_only: true, read_only_value: "50% deposit due on booking" },
      ]),
    }))

    const body = await response.json()
    expect(body.relatedIds).toMatchObject({
      eventId: "event-1",
      customerId: "customer-1",
      venueId: "venue-1",
      invoiceId: "invoice-1",
      businessId: "business-1",
    })
  })

  it("uses a contract template from Firma when FIRMA_TEMPLATE_ID is not configured", async () => {
    delete process.env.FIRMA_TEMPLATE_ID
    listTemplatesMock.mockResolvedValue({
      results: [
        { id: "tpl_other", name: "Other" },
        { id: "tpl_contract", name: "Standard contract" },
      ],
    })

    const response = await POST(request({
      eventId: "event-1",
      data: {
        event: { title: "Launch Party" },
        customer: { fullName: "Ada Lovelace", email: "ada@example.com" },
      },
    }) as never)

    expect(response.status).toBe(200)
    expect(createSigningRequestMock).toHaveBeenCalledWith("tpl_contract", expect.any(Object))
    expect(getTemplateMock).toHaveBeenCalledWith("tpl_contract")
  })
})
