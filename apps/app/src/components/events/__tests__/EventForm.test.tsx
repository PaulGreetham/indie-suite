import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { getDocsMock, getFirestoreDbMock, useAuthMock } = vi.hoisted(() => ({
  getDocsMock: vi.fn(),
  getFirestoreDbMock: vi.fn(),
  useAuthMock: vi.fn(),
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

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("@/components/ui/calendar", () => ({
  Calendar: () => <div data-testid="calendar" />,
}))

vi.mock("@/lib/firebase/client", () => ({
  getFirestoreDb: getFirestoreDbMock,
}))

vi.mock("@/lib/firebase/auth-context", () => ({
  useAuth: useAuthMock,
}))

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  where: () => ({ type: "where" }),
  orderBy: () => ({ type: "orderBy" }),
  query: (collectionRef: unknown) => collectionRef,
  getDocs: getDocsMock,
}))

import { EventForm } from "../EventForm"

describe("EventForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getFirestoreDbMock.mockReturnValue({ id: "db" })
    useAuthMock.mockReturnValue({ user: { uid: "user-1" } })
    getDocsMock.mockImplementation(async (ref: { name?: string }) => {
      if (ref.name === "customers") {
        return {
          docs: [{ id: "customer-1", data: () => ({ fullName: "Jane Doe" }) }],
        }
      }

      return {
        docs: [{ id: "venue-1", data: () => ({ name: "Main Hall" }) }],
      }
    })
  })

  it("loads options and submits selected event details", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<EventForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Launch Party" },
    })
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "Evening reception" },
    })

    await waitFor(() =>
      expect(screen.getByLabelText("Select customer")).toBeInTheDocument()
    )

    fireEvent.change(screen.getByLabelText("Select customer"), {
      target: { value: "customer-1" },
    })
    fireEvent.change(screen.getByLabelText("Select venue"), {
      target: { value: "venue-1" },
    })

    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!)

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        title: "Launch Party",
        startsAt: undefined,
        endsAt: undefined,
        customerId: "customer-1",
        venueId: "venue-1",
        notes: "Evening reception",
      })
    )
  })

  it("hides actions in read-only mode", () => {
    render(
      <EventForm
        onSubmit={vi.fn()}
        readOnly
        initial={{ title: "Launch Party" }}
      />
    )

    expect(screen.getByLabelText("Title")).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument()
  })
})
