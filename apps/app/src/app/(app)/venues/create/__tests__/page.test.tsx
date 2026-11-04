import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { getDocsMock, whereMock } = vi.hoisted(() => ({ getDocsMock: vi.fn(), whereMock: vi.fn() }))

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/lib/firebase/venues", () => ({ createVenue: vi.fn() }))
vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => ({ currentUser: { uid: "user-1" } }),
  getFirestoreDb: () => ({ id: "db" }),
}))
vi.mock("@/lib/business-context", () => ({
  useBusiness: () => ({ resolveActiveBusinessId: resolveBusiness }),
}))
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  where: whereMock,
  query: (ref: unknown) => ref,
  getDocs: getDocsMock,
}))
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onChange, options, placeholder }: {
    value?: string
    onChange?: (value: string) => void
    options: Array<{ value: string; label: string }>
    placeholder?: string
  }) => (
    <select aria-label={placeholder} value={value ?? ""} onChange={(e) => onChange?.(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
}))

const resolveBusiness = () => Promise.resolve("biz-1")

import CreateVenuePage from "../page"

describe("Create venue: copy details from a client (UI-F10)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getDocsMock.mockResolvedValue({
      docs: [
        { id: "c1", data: () => ({ company: "Acme Events", fullName: "Jane Client", phone: "+44 20 7000 0000", website: "https://acme.example", address: { street: "Baker Street", city: "London", postcode: "NW1 6XE" } }) },
        { id: "c2", data: () => ({ fullName: "No Details", address: null }) },
        { id: "c3", data: () => ({ fullName: "Phone Only", phone: "+44 7700 900000" }) },
      ],
    })
  })

  it("fills the venue name, phone, website and address from the chosen client", async () => {
    render(<CreateVenuePage />)

    const picker = await screen.findByLabelText("Choose a client")
    expect(screen.queryByRole("option", { name: "No Details" })).not.toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Phone Only" })).toBeInTheDocument()
    expect(whereMock).toHaveBeenCalledWith("businessId", "==", "biz-1")

    fireEvent.change(picker, { target: { value: "c1" } })

    await waitFor(() => expect(screen.getByLabelText("Venue name")).toHaveValue("Acme Events"))
    expect(screen.getByLabelText("Street")).toHaveValue("Baker Street")
    expect(screen.getByLabelText("Town/City")).toHaveValue("London")
    expect(screen.getByLabelText("Post/Zip code")).toHaveValue("NW1 6XE")
    expect(screen.getByLabelText("Phone number")).toHaveValue("+44 20 7000 0000")
    expect(screen.getByLabelText("Website")).toHaveValue("https://acme.example")
  })

  it("hides the picker when no client has details to copy", async () => {
    getDocsMock.mockResolvedValue({ docs: [{ id: "c2", data: () => ({ fullName: "No Details" }) }] })
    render(<CreateVenuePage />)

    await waitFor(() => expect(getDocsMock).toHaveBeenCalled())
    expect(screen.queryByLabelText("Choose a client")).not.toBeInTheDocument()
  })
})
