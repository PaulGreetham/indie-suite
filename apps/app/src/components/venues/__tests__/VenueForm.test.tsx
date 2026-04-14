import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { VenueForm } from "../VenueForm"

describe("VenueForm", () => {
  it("submits normalized venue values and triggers cancel", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onCancel = vi.fn()

    render(<VenueForm onSubmit={onSubmit} onCancel={onCancel} />)

    fireEvent.change(screen.getByLabelText("Venue name"), {
      target: { value: "  Main Hall  " },
    })
    fireEvent.change(screen.getByLabelText("Website"), {
      target: { value: "venue.example.com" },
    })
    fireEvent.change(screen.getByLabelText("Post/Zip code"), {
      target: { value: " LS1 1AA " },
    })
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "  Loading bay at rear " },
    })

    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!)

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Main Hall",
        phone: undefined,
        website: "https://venue.example.com",
        address: {
          building: undefined,
          street: undefined,
          city: undefined,
          area: undefined,
          postcode: "LS1 1AA",
          country: undefined,
        },
        notes: "Loading bay at rear",
      })
    )

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).toHaveBeenCalled()
  })

  it("hides actions in read-only mode", () => {
    render(
      <VenueForm
        onSubmit={vi.fn()}
        readOnly
        initial={{ name: "Main Hall" }}
      />
    )

    expect(screen.getByLabelText("Venue name")).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument()
  })
})
