import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AccountForm } from "../AccountForm"

describe("AccountForm", () => {
  it("submits normalized account values and handles cancel", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onCancel = vi.fn()

    render(<AccountForm onSubmit={onSubmit} onCancel={onCancel} />)

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "  Jane Doe  " },
    })
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "  jane@example.com  " },
    })
    fireEvent.change(screen.getByLabelText("Website"), {
      target: { value: "example.com" },
    })
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "  Leeds  " },
    })

    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!)

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        fullName: "Jane Doe",
        email: "jane@example.com",
        phone: undefined,
        company: undefined,
        website: "https://example.com",
        address: {
          building: undefined,
          street: undefined,
          city: "Leeds",
          area: undefined,
          postcode: undefined,
          country: undefined,
        },
      })
    )

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).toHaveBeenCalled()
  })
})
