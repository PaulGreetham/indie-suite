import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getDocsMock,
  getFirestoreDbMock,
  useAuthMock,
  resolveActiveBusinessIdMock,
  listTradingDetailsMock,
  listBankAccountsMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  getDocsMock: vi.fn(),
  getFirestoreDbMock: vi.fn(),
  useAuthMock: vi.fn(),
  resolveActiveBusinessIdMock: vi.fn(),
  listTradingDetailsMock: vi.fn(),
  listBankAccountsMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onChange,
    options,
    placeholder,
  }: {
    value?: string
    onChange?: (value: string) => void
    options: Array<{ value: string; label: string }>
    placeholder?: string
  }) => (
    <select
      aria-label={placeholder ?? "Select"}
      value={value ?? ""}
      onChange={(event) => onChange?.(event.target.value)}
    >
      <option value="">{placeholder ?? "Select"}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    disabled,
  }: {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
  }) => (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}))

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("@/components/ui/calendar", () => ({
  Calendar: () => <div data-testid="calendar" />,
}))

vi.mock("@/lib/firebase/invoices", () => ({
  createInvoice: vi.fn(),
}))

vi.mock("@/lib/firebase/client", () => ({
  getFirestoreDb: getFirestoreDbMock,
}))

vi.mock("@/lib/firebase/auth-context", () => ({
  useAuth: useAuthMock,
}))

vi.mock("@/lib/business-context", () => ({
  useBusiness: () => ({
    resolveActiveBusinessId: resolveActiveBusinessIdMock,
  }),
}))

vi.mock("@/lib/firebase/user-settings", () => ({
  listTradingDetails: listTradingDetailsMock,
  listBankAccounts: listBankAccountsMock,
}))

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  where: () => ({ type: "where" }),
  orderBy: () => ({ type: "orderBy" }),
  query: (collectionRef: unknown) => collectionRef,
  getDocs: getDocsMock,
}))

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: vi.fn(),
  },
}))

import InvoiceForm from "../InvoiceForm"

describe("InvoiceForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getFirestoreDbMock.mockReturnValue({ id: "db" })
    useAuthMock.mockReturnValue({ user: { uid: "user-1" } })
    resolveActiveBusinessIdMock.mockResolvedValue("biz-1")
    listTradingDetailsMock.mockResolvedValue([
      {
        id: "trading-1",
        name: "Indie Suite Studio",
        emails: ["studio@example.com"],
        contactName: "Jane Doe",
        contactEmail: "studio@example.com",
        phone: "+44 1000 000000",
      },
    ])
    listBankAccountsMock.mockResolvedValue([{ id: "bank-1", name: "Main Account" }])
    getDocsMock.mockImplementation(async (ref: { name?: string }) => {
      if (ref.name === "customers") {
        return {
          docs: [
            {
              id: "customer-1",
              data: () => ({
                company: "Acme Events",
                fullName: "Jane Client",
                email: "client@example.com",
                phone: "+44 2000 000000",
              }),
            },
          ],
        }
      }

      if (ref.name === "venues") {
        return {
          docs: [
            {
              id: "venue-1",
              data: () => ({
                name: "Main Hall",
                address: { city: "Leeds", postcode: "LS1 1AA" },
                phone: "+44 3000 000000",
              }),
            },
          ],
        }
      }

      return {
        docs: [
          {
            id: "event-1",
            data: () => ({
              title: "Launch Party",
              customerId: "customer-1",
              venueId: "venue-1",
            }),
          },
        ],
      }
    })
  })

  it("hydrates related data from selections and submits the invoice payload", async () => {
    const onSubmitExternal = vi.fn().mockResolvedValue(undefined)
    const { container } = render(<InvoiceForm onSubmitExternal={onSubmitExternal} />)

    await waitFor(() =>
      expect(screen.getByLabelText("Select event")).toBeInTheDocument()
    )

    fireEvent.change(screen.getByLabelText("Select business"), {
      target: { value: "trading-1" },
    })
    fireEvent.change(screen.getByLabelText("Select event"), {
      target: { value: "event-1" },
    })

    fireEvent.change(
      container.querySelector('input[placeholder="INV-2025-001-DEP1"]')!,
      { target: { value: "INV-1001" } }
    )
    fireEvent.change(container.querySelector('input[inputmode="decimal"]')!, {
      target: { value: "1200" },
    })
    fireEvent.change(
      screen.getByPlaceholderText("https://pay.stripe.com/..."),
      { target: { value: "https://pay.example.com/invoice/1001" } }
    )
    fireEvent.change(
      screen.getByPlaceholderText("Thanks for your business."),
      { target: { value: "Please pay within 7 days." } }
    )

    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!)

    await waitFor(() =>
      expect(onSubmitExternal).toHaveBeenCalledWith(
        expect.objectContaining({
          invoice_number: "INV-1001",
          user_business_name: "Indie Suite Studio",
          user_email: "studio@example.com",
          customer_name: "Acme Events",
          customer_email: "client@example.com",
          venue_name: "Main Hall",
          venue_city: "Leeds",
          venue_postcode: "LS1 1AA",
          venue_phone: "+44 3000 000000",
          eventId: "event-1",
          payment_link: "https://pay.example.com/invoice/1001",
          notes: "Please pay within 7 days.",
          payments: [
            expect.objectContaining({
              name: "Final payment",
              invoice_number: "INV-1001",
              currency: "GBP",
              amount: 1200,
            }),
          ],
          status: "draft",
          include_payment_link: true,
          include_bank_account: false,
          include_notes: true,
        })
      )
    )
  })

  it("hides actions in read-only mode", () => {
    render(<InvoiceForm readOnly />)

    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument()
  })
})
