import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { getDocsMock } = vi.hoisted(() => ({ getDocsMock: vi.fn() }))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// One stable user object, like the real auth context; a new object per render would refetch forever
const authState = { user: { uid: "user-1" }, loading: false }
vi.mock("@/lib/firebase/auth-context", () => ({ useAuth: () => authState }))
vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => ({ currentUser: null }),
  getFirestoreDb: () => ({ id: "db" }),
}))
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  where: () => ({ type: "where" }),
  query: (ref: unknown) => ref,
  getDocs: getDocsMock,
}))

import ReceiptsPage from "../page"

function paidInvoices(count: number) {
  const docs = Array.from({ length: count }, (_, i) => ({
    id: `inv-${i + 1}`,
    data: () => ({
      status: "paid",
      invoice_number: `INV-${String(i + 1).padStart(3, "0")}`,
      customer_name: "Acme Events",
      paidAt: `2026-10-${String(i + 1).padStart(2, "0")}`,
    }),
  }))
  return { forEach: (fn: (d: (typeof docs)[number]) => void) => docs.forEach(fn) }
}

describe("Receipts (UI-F04)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("pages through every paid invoice", async () => {
    getDocsMock.mockResolvedValue(paidInvoices(12))
    render(<ReceiptsPage />)

    await waitFor(() => expect(screen.getByText("Page 1 of 2")).toBeInTheDocument())
    expect(screen.getAllByRole("button", { name: "Download" })).toHaveLength(10)
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled()

    fireEvent.click(screen.getByRole("button", { name: "Next" }))

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Download" })).toHaveLength(2)
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled()
  })

  it("goes back to the first page when the search changes", async () => {
    getDocsMock.mockResolvedValue(paidInvoices(12))
    render(<ReceiptsPage />)

    await waitFor(() => expect(screen.getByText("Page 1 of 2")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    fireEvent.change(screen.getByPlaceholderText("Filter invoice #..."), { target: { value: "INV-01" } })

    expect(screen.queryByText(/Page \d of \d/)).not.toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Download" })).toHaveLength(3)
  })

  it("shows no pager when everything fits on one page", async () => {
    getDocsMock.mockResolvedValue(paidInvoices(4))
    render(<ReceiptsPage />)

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Download" })).toHaveLength(4))
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument()
  })
})
