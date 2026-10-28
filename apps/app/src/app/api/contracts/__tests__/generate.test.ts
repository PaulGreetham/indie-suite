import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getFirmaClientMock,
  createSigningRequestMock,
  getTemplateMock,
  listTemplatesMock,
  getAdminAuthMock,
  getAdminDbMock,
  verifyIdTokenMock,
  ensureFirmaWorkspaceMock,
} = vi.hoisted(() => ({
  getFirmaClientMock: vi.fn(),
  createSigningRequestMock: vi.fn(),
  getTemplateMock: vi.fn(),
  listTemplatesMock: vi.fn(),
  getAdminAuthMock: vi.fn(),
  getAdminDbMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
  ensureFirmaWorkspaceMock: vi.fn(),
}))

vi.mock("@/lib/firma/server", () => ({
  getFirmaClient: getFirmaClientMock,
}))

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: getAdminAuthMock,
  getAdminDb: getAdminDbMock,
}))

vi.mock("@/lib/firma/provisioning", () => ({
  ensureFirmaWorkspaceForBusiness: ensureFirmaWorkspaceMock,
}))

import { POST } from "../generate/route"

type Docs = Record<string, Record<string, Record<string, unknown> | undefined>>

function request(body: unknown, token: string | null = "token"): Request {
  return new Request("http://localhost/api/contracts/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
}

// Minimal Admin Firestore fake: doc(id).get() per collection, plus the invoices where().where().limit().get() query
function mockDb(docs: Docs, invoices: Array<{ id: string; data: Record<string, unknown> }> = []) {
  const collection = vi.fn((name: string) => {
    if (name === "invoices") {
      const query = {
        where: vi.fn(() => query),
        limit: vi.fn(() => query),
        get: vi.fn(async () => ({ empty: invoices.length === 0, docs: invoices.map((i) => ({ id: i.id, data: () => i.data })) })),
      }
      return query
    }
    return {
      doc: vi.fn((id: string) => ({
        get: vi.fn(async () => {
          const data = docs[name]?.[id]
          return { exists: Boolean(data), id, data: () => data }
        }),
      })),
    }
  })
  getAdminDbMock.mockReturnValue({ collection })
  return { collection }
}

const ownedEvent = {
  ownerId: "user-1",
  title: "Launch Party",
  customerId: "customer-1",
  venueId: "venue-1",
  businessId: "business-1",
  startsAt: "2026-05-01T18:00:00.000Z",
}
const ownedCustomer = { ownerId: "user-1", fullName: "Ada Lovelace", email: "ada@example.com", company: "Analytical Engines Ltd" }
const ownedVenue = { ownerId: "user-1", name: "Town Hall" }

describe("contracts generate route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FIRMA_TEMPLATE_ID = "tpl_contract"
    verifyIdTokenMock.mockResolvedValue({ uid: "user-1", email_verified: true })
    getAdminAuthMock.mockReturnValue({ verifyIdToken: verifyIdTokenMock })
    ensureFirmaWorkspaceMock.mockResolvedValue(null)
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

  it("returns 401 without a token", async () => {
    mockDb({ events: { "event-1": ownedEvent } })

    const response = await POST(request({ eventId: "event-1" }, null) as never)

    expect(response.status).toBe(401)
    expect(createSigningRequestMock).not.toHaveBeenCalled()
  })

  it("requires an eventId and ignores client-supplied data", async () => {
    mockDb({})

    const response = await POST(request({
      data: {
        event: { title: "Spoofed" },
        customer: { fullName: "Victim", email: "victim@example.com" },
      },
    }) as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "missing_eventId" })
    expect(createSigningRequestMock).not.toHaveBeenCalled()
  })

  it("returns 404 for another user's event", async () => {
    mockDb({ events: { "event-1": { ...ownedEvent, ownerId: "user-2" } } })

    const response = await POST(request({ eventId: "event-1" }) as never)

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: "not_found" })
    expect(createSigningRequestMock).not.toHaveBeenCalled()
  })

  it("returns 404 for an event with no ownerId (fails closed)", async () => {
    mockDb({ events: { "event-1": { ...ownedEvent, ownerId: undefined } } })

    const response = await POST(request({ eventId: "event-1" }) as never)

    expect(response.status).toBe(404)
    expect(createSigningRequestMock).not.toHaveBeenCalled()
  })

  it("does not read a customer owned by another tenant", async () => {
    mockDb({
      events: { "event-1": ownedEvent },
      customers: { "customer-1": { ...ownedCustomer, ownerId: "user-2" } },
      venues: { "venue-1": ownedVenue },
    })

    const response = await POST(request({ eventId: "event-1" }) as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "missing_recipient_email" })
    expect(createSigningRequestMock).not.toHaveBeenCalled()
  })

  it("uses server-loaded records even when client data is supplied", async () => {
    mockDb({
      events: { "event-1": ownedEvent },
      customers: { "customer-1": ownedCustomer },
      venues: { "venue-1": ownedVenue },
    })

    const response = await POST(request({
      eventId: "event-1",
      data: { customer: { fullName: "Spoofed", email: "attacker@example.com" } },
    }) as never)

    expect(response.status).toBe(200)
    const payload = createSigningRequestMock.mock.calls[0][1] as { recipients: Array<{ email: string }> }
    expect(payload.recipients[0].email).toBe("ada@example.com")
  })

  it("returns a clear error when the customer has no email", async () => {
    mockDb({
      events: { "event-1": ownedEvent },
      customers: { "customer-1": { ownerId: "user-1", fullName: "Ada Lovelace" } },
    })

    const response = await POST(request({ eventId: "event-1" }) as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "missing_recipient_email" })
    expect(createSigningRequestMock).not.toHaveBeenCalled()
  })

  it("creates a Firma request with recipients and flat field overrides", async () => {
    mockDb(
      {
        events: { "event-1": ownedEvent },
        customers: { "customer-1": ownedCustomer },
        venues: { "venue-1": ownedVenue },
      },
      [{ id: "invoice-1", data: { ownerId: "user-1", invoiceNumber: "INV-001", total: 1200 } }]
    )

    const response = await POST(request({
      eventId: "event-1",
      terms: [{ text: "50% deposit due on booking" }],
      notes: "Use main hall entrance",
    }) as never)

    expect(response.status).toBe(200)
    expect(ensureFirmaWorkspaceMock).toHaveBeenCalledWith("business-1", "user-1")
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
    mockDb({
      events: { "event-1": { ownerId: "user-1", title: "Launch Party", customerId: "customer-1" } },
      customers: { "customer-1": ownedCustomer },
    })

    const response = await POST(request({ eventId: "event-1" }) as never)

    expect(response.status).toBe(200)
    expect(createSigningRequestMock).toHaveBeenCalledWith("tpl_contract", expect.any(Object))
    expect(getTemplateMock).toHaveBeenCalledWith("tpl_contract")
  })

  it("returns a generic error when Firma rejects the request", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    createSigningRequestMock.mockRejectedValue(new Error("FIRMA_ERROR 500 upstream detail"))
    mockDb({
      events: { "event-1": ownedEvent },
      customers: { "customer-1": ownedCustomer },
    })

    const response = await POST(request({ eventId: "event-1" }) as never)

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({ error: "firma_error" })
    spy.mockRestore()
  })
})
