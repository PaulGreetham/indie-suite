import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const { toastErrorMock } = vi.hoisted(() => ({ toastErrorMock: vi.fn() }))

vi.mock("sonner", () => ({ toast: { error: toastErrorMock } }))

import { BankAccountForm } from "../BankAccountForm"

describe("BankAccountForm", () => {
  it("submits trimmed bank account values", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<BankAccountForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText("Name for this account"), {
      target: { value: "  Main GBP Account  " },
    })
    fireEvent.change(screen.getByLabelText("Bank name"), {
      target: { value: "  Barclays  " },
    })
    fireEvent.change(screen.getByLabelText("Currency"), {
      target: { value: " gbp " },
    })
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "  Use for UK transfers " },
    })

    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!)

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Main GBP Account",
        bankName: "Barclays",
        accountHolder: undefined,
        accountNumberOrIban: undefined,
        sortCodeOrBic: undefined,
        currency: "gbp",
        notes: "Use for UK transfers",
      })
    )
  })

  it("shows a toast instead of failing silently when saving is denied", async () => {
    const onSubmit = vi.fn().mockRejectedValue(Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" }))

    render(<BankAccountForm onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("Name for this account"), { target: { value: "Main" } })
    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!)

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("You don't have access to that. Reload the page and try again."))
  })

  it("hides action buttons when hideActions is enabled", () => {
    render(<BankAccountForm onSubmit={vi.fn()} hideActions />)

    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument()
  })
})
