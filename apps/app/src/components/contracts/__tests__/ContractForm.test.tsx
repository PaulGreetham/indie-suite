import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { getDocsMock, getFirebaseAuthMock, getFirestoreDbMock } = vi.hoisted(() => ({
  getDocsMock: vi.fn(),
  getFirebaseAuthMock: vi.fn(),
  getFirestoreDbMock: vi.fn(),
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

vi.mock("@/lib/firebase/client", () => ({
  getFirestoreDb: getFirestoreDbMock,
  getFirebaseAuth: getFirebaseAuthMock,
}))

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  where: () => ({ type: "where" }),
  orderBy: () => ({ type: "orderBy" }),
  query: (collectionRef: unknown) => collectionRef,
  getDocs: getDocsMock,
}))

import { ContractForm } from "../ContractForm"

describe("ContractForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getFirestoreDbMock.mockReturnValue({ id: "db" })
    getFirebaseAuthMock.mockReturnValue({ currentUser: { uid: "user-1" } })
    getDocsMock.mockResolvedValue({
      docs: [
        {
          id: "event-1",
          data: () => ({ title: "Launch Party" }),
        },
      ],
    })
  })

  it("loads events, edits terms, and submits the contract payload", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<ContractForm onSubmit={onSubmit} />)

    await waitFor(() =>
      expect(screen.getByLabelText("Select event")).toBeInTheDocument()
    )

    fireEvent.change(screen.getByLabelText("Select event"), {
      target: { value: "event-1" },
    })

    const termInputs = screen.getAllByPlaceholderText("e.g., 50% deposit on order")
    fireEvent.change(termInputs[0], { target: { value: "Deposit due on booking" } })
    fireEvent.click(screen.getByRole("button", { name: "Add term" }))

    const updatedInputs = screen.getAllByPlaceholderText("e.g., 50% deposit on order")
    fireEvent.change(updatedInputs[1], { target: { value: "Balance due 7 days before event" } })
    fireEvent.change(screen.getByPlaceholderText("Any extra clauses or info"), {
      target: { value: "Use the main hall entrance" },
    })

    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!)

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        eventId: "event-1",
        terms: [
          expect.objectContaining({ text: "Deposit due on booking" }),
          expect.objectContaining({ text: "Balance due 7 days before event" }),
        ],
        notes: "Use the main hall entrance",
      })
    )
  })

  it("supports read-only mode without action buttons", async () => {
    render(
      <ContractForm
        onSubmit={vi.fn()}
        readOnly
        initial={{ terms: [{ id: "term-1", text: "Sample term" }] }}
      />
    )

    await waitFor(() =>
      expect(screen.getByDisplayValue("Sample term")).toBeDisabled()
    )
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument()
  })
})
