import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { pushMock, createEventMock } = vi.hoisted(() => ({ pushMock: vi.fn(), createEventMock: vi.fn() }))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/lib/firebase/events", () => ({ createEvent: createEventMock }))
vi.mock("@/lib/business-context", () => ({ useBusiness: () => ({ resolveActiveBusinessId: () => Promise.resolve("biz-1") }) }))
// The form itself is covered by EventForm.test.tsx; here it only needs to submit valid values
vi.mock("@/components/events/EventForm", () => ({
  EventForm: ({ onSubmit }: { onSubmit: (v: unknown) => Promise<void> }) => (
    // Like the real form, a failed save is caught (and toasted) rather than left unhandled
    <button onClick={() => onSubmit({ title: "Wedding", startsAt: new Date("2026-12-01T19:00:00Z"), customerId: "c1", venueId: "v1" }).catch(() => undefined)}>
      Save
    </button>
  ),
}))

import AddEventPage from "../page"

describe("Create event (UI-F07)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("goes to the events list after saving, so the form can't create a duplicate", async () => {
    createEventMock.mockResolvedValue("event-1")
    render(<AddEventPage />)

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/events/all"))
    expect(createEventMock).toHaveBeenCalledTimes(1)
  })

  it("stays on the form when saving fails", async () => {
    createEventMock.mockRejectedValue(new Error("boom"))
    render(<AddEventPage />)

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => expect(createEventMock).toHaveBeenCalled())
    expect(pushMock).not.toHaveBeenCalled()
  })
})
