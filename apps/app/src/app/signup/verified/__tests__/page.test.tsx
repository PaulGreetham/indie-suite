import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }))

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => ({ plan: "pro-plus", interval: "yearly" } as Record<string, string>)[key] ?? null }),
}))
vi.mock("@/lib/firebase/auth-context", () => ({ useAuth: useAuthMock }))
vi.mock("@/lib/firebase/client", () => ({ getFirebaseAuth: vi.fn() }))
vi.mock("@/lib/firebase/auth", () => ({ sendVerificationEmail: vi.fn() }))

import SignupVerifiedPage from "../page"

describe("/signup/verified", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("waits for the session instead of guessing (SU-12)", () => {
    useAuthMock.mockReturnValue({ user: null, loading: true })
    render(<SignupVerifiedPage />)
    expect(screen.getByText("Loading…")).toBeInTheDocument()
  })

  it("offers a log-in link when nobody is signed in on this device", () => {
    useAuthMock.mockReturnValue({ user: null, loading: false })
    render(<SignupVerifiedPage />)
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login")
  })

  it("shows the user's email and the plan step once verified", () => {
    useAuthMock.mockReturnValue({ user: { email: "ada@example.com", emailVerified: true }, loading: false })
    render(<SignupVerifiedPage />)
    expect(screen.getByText(/to ada@example.com/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Choose my plan" })).toBeInTheDocument()
  })

  it("asks an unverified user to verify first", () => {
    useAuthMock.mockReturnValue({ user: { email: "ada@example.com", emailVerified: false }, loading: false })
    render(<SignupVerifiedPage />)
    expect(screen.getByRole("button", { name: "I've verified, continue" })).toBeInTheDocument()
  })
})
