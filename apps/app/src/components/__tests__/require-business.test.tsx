import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { useBusinessMock } = vi.hoisted(() => ({ useBusinessMock: vi.fn() }))

vi.mock("@/lib/business-context", () => ({ useBusiness: useBusinessMock }))
vi.mock("next/navigation", () => ({ usePathname: () => "/customers/create" }))

import { RequireBusiness } from "../require-business"

describe("RequireBusiness (UI-F09)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("asks for business details, linking back to the current page, when there is no business", () => {
    useBusinessMock.mockReturnValue({ businessStatus: "none" })
    render(<RequireBusiness><p>Client form</p></RequireBusiness>)

    expect(screen.getByRole("heading", { name: "Add your business details first" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Add business details" })).toHaveAttribute(
      "href",
      "/settings/trading-details?next=%2Fcustomers%2Fcreate"
    )
    expect(screen.queryByText("Client form")).not.toBeInTheDocument()
  })

  it("shows the page once a business exists", () => {
    useBusinessMock.mockReturnValue({ businessStatus: "ready" })
    render(<RequireBusiness><p>Client form</p></RequireBusiness>)

    expect(screen.getByText("Client form")).toBeInTheDocument()
  })

  it("shows nothing while the check is running, so the form never flashes", () => {
    useBusinessMock.mockReturnValue({ businessStatus: "loading" })
    const { container } = render(<RequireBusiness><p>Client form</p></RequireBusiness>)

    expect(container).toBeEmptyDOMElement()
  })
})
