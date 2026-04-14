import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StatusBadge } from "../StatusBadge"

describe("StatusBadge", () => {
  it("renders the expected label for each invoice status", () => {
    const { rerender } = render(<StatusBadge status="draft" />)
    expect(screen.getByText("Draft")).toBeInTheDocument()

    rerender(<StatusBadge status="sent" />)
    expect(screen.getByText("Open")).toBeInTheDocument()

    rerender(<StatusBadge status="paid" />)
    expect(screen.getByText("Paid")).toBeInTheDocument()

    rerender(<StatusBadge status="overdue" />)
    expect(screen.getByText("Overdue")).toBeInTheDocument()

    rerender(<StatusBadge status="void" />)
    expect(screen.getByText("Void")).toBeInTheDocument()

    rerender(<StatusBadge status="partial" />)
    expect(screen.getByText("Partially Paid")).toBeInTheDocument()
  })

  it("passes custom classes through to the rendered badge", () => {
    render(<StatusBadge status="paid" className="custom-class" />)

    expect(screen.getByText("Paid")).toHaveClass("custom-class")
  })
})
