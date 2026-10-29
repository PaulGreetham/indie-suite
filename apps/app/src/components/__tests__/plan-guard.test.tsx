import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { replaceMock, fetchSubscriptionMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  fetchSubscriptionMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}))

vi.mock("@/lib/stripe/billing-client", () => ({
  fetchSubscription: fetchSubscriptionMock,
}))

import { PlanGuard } from "../plan-guard"

function renderGuard() {
  return render(
    <PlanGuard>
      <div>Protected content</div>
    </PlanGuard>
  )
}

describe("PlanGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows a loading state while the plan is checked", () => {
    fetchSubscriptionMock.mockReturnValue(new Promise(() => {}))
    renderGuard()
    expect(screen.getByText("Checking your plan...")).toBeInTheDocument()
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument()
  })

  it("renders the app for an active plan", async () => {
    fetchSubscriptionMock.mockResolvedValue({ active: true })
    renderGuard()
    expect(await screen.findByText("Protected content")).toBeInTheDocument()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it.each([
    ["an inactive plan", () => fetchSubscriptionMock.mockResolvedValue({ active: false })],
    ["a failed lookup", () => fetchSubscriptionMock.mockResolvedValue(null)],
    ["a thrown error", () => fetchSubscriptionMock.mockRejectedValue(new Error("network"))],
  ])("redirects to /subscribe for %s", async (_label, arrange) => {
    arrange()
    const { container } = renderGuard()
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/subscribe"))
    expect(container).toBeEmptyDOMElement()
  })
})
