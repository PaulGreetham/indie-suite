import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { TradingDetailsForm } from "../TradingDetailsForm"

describe("TradingDetailsForm", () => {
  it("submits trimmed trading details values", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onCancel = vi.fn()

    render(<TradingDetailsForm onSubmit={onSubmit} onCancel={onCancel} />)

    fireEvent.change(screen.getByLabelText("Trading/Business Name"), {
      target: { value: "  Acme Events Ltd  " },
    })
    fireEvent.change(screen.getByLabelText("Contact name"), {
      target: { value: "  Jane Doe  " },
    })
    fireEvent.change(screen.getByLabelText("Contact email"), {
      target: { value: "  billing@acme.com  " },
    })
    fireEvent.change(screen.getByLabelText("Town/City"), {
      target: { value: "  Leeds  " },
    })

    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!)

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Acme Events Ltd",
        contactName: "Jane Doe",
        contactEmail: "billing@acme.com",
        phone: undefined,
        building: undefined,
        street: undefined,
        city: "Leeds",
        area: undefined,
        postcode: undefined,
        country: undefined,
      })
    )

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).toHaveBeenCalled()
  })

  it("disables inputs and hides actions in read-only mode", () => {
    render(
      <TradingDetailsForm
        onSubmit={vi.fn()}
        readOnly
        initial={{ name: "Acme Events Ltd" }}
      />
    )

    expect(screen.getByLabelText("Trading/Business Name")).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument()
  })
})
