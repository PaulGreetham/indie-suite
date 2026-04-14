import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { CustomerForm } from "../CustomerForm"

describe("CustomerForm", () => {
  it("submits normalized customer values and resets the form", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<CustomerForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText("Contact name"), {
      target: { value: "  Jane Doe  " },
    })
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "  jane@example.com  " },
    })
    fireEvent.change(screen.getByLabelText("Website"), {
      target: { value: "acme.dev" },
    })
    fireEvent.change(screen.getByLabelText("Town/City"), {
      target: { value: " Leeds " },
    })
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "  Priority client " },
    })

    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!)

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        fullName: "Jane Doe",
        company: undefined,
        email: "jane@example.com",
        phone: undefined,
        website: "https://acme.dev",
        address: {
          building: undefined,
          street: undefined,
          city: "Leeds",
          area: undefined,
          postcode: undefined,
          country: undefined,
        },
        notes: "Priority client",
      })
    )

    await waitFor(() =>
      expect(screen.getByLabelText("Contact name")).toHaveValue("")
    )
  })

  it("supports read-only mode without action buttons", () => {
    render(
      <CustomerForm
        onSubmit={vi.fn()}
        readOnly
        initial={{ fullName: "Jane Doe", email: "jane@example.com" }}
      />
    )

    expect(screen.getByLabelText("Contact name")).toHaveAttribute("readonly")
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument()
  })
})
