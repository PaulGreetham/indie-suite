import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

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

  it("hides action buttons when hideActions is enabled", () => {
    render(<BankAccountForm onSubmit={vi.fn()} hideActions />)

    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument()
  })
})
