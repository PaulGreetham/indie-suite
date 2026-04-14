import { describe, expect, it } from "vitest"

import { formatInvoiceData, renderInvoiceHtml } from "../invoice-template"

describe("invoice template helpers", () => {
  it("formats invoice data with totals, currency, dates, and payment descriptions", () => {
    const formatted = formatInvoiceData({
      invoice_number: "INV-1001",
      issue_date: "2026-03-04",
      due_date: "2026-03-20",
      payments: [
        {
          name: "Venue hire",
          reference: "REF-123",
          amount: 1500,
          currency: "gbp",
        },
        {
          reference: "DEP-1",
          amount: 250,
        },
      ],
    })

    expect(formatted).toMatchObject({
      issue_date: "04 Mar 2026",
      due_date: "20 Mar 2026",
      currency: "gbp",
      total: "1750.00",
      totalFormatted: "GBP 1750.00",
    })
    expect(formatted.payments).toEqual([
      expect.objectContaining({
        desc: "Venue hire – REF-123",
        amountFormatted: "GBP 1500.00",
      }),
      expect.objectContaining({
        desc: "DEP-1",
        amountFormatted: "GBP 250.00",
      }),
    ])
  })

  it("renders invoice html with optional sections and formatted content", () => {
    const html = renderInvoiceHtml({
      invoice_number: "INV-1002",
      issue_date: "2026-05-01",
      due_date: "2026-05-15",
      user_business_name: "Indie Suite Studio",
      customer_name: "Acme Events",
      customer_email: "accounts@acme.dev",
      venue_name: "The Hall",
      venue_city: "Leeds",
      venue_postcode: "LS1 1AA",
      notes: "Thanks for your business",
      payment_link: "https://pay.example.com/invoice/1002",
      include_bank_account: true,
      bank_account: {
        name: "Main Account",
        bankName: "Example Bank",
        accountHolder: "Indie Suite Ltd",
        accountNumberOrIban: "GB00TEST123456",
        sortCodeOrBic: "12-34-56",
        currency: "GBP",
      },
      payments: [
        {
          name: "Production",
          amount: 999,
          currency: "GBP",
        },
      ],
    })

    expect(html).toContain("Invoice #INV-1002")
    expect(html).toContain("Indie Suite Studio")
    expect(html).toContain("Acme Events")
    expect(html).toContain("01 May 2026")
    expect(html).toContain("15 May 2026")
    expect(html).toContain("GBP 999.00")
    expect(html).toContain("Production")
    expect(html).toContain("Thanks for your business")
    expect(html).toContain("Main Account")
    expect(html).toContain("https://pay.example.com/invoice/1002")
  })
})
