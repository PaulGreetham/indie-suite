import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { pushMock, useAuthMock, getFirebaseAuthMock, sendEmailVerificationMock } =
  vi.hoisted(() => ({
    pushMock: vi.fn(),
    useAuthMock: vi.fn(),
    getFirebaseAuthMock: vi.fn(),
    sendEmailVerificationMock: vi.fn(),
  }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("@/lib/firebase/auth-context", () => ({
  useAuth: useAuthMock,
}))

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: getFirebaseAuthMock,
}))

vi.mock("firebase/auth", () => ({
  sendEmailVerification: sendEmailVerificationMock,
}))

import { AuthGuard } from "../auth-guard"

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows a loading state while auth is resolving", () => {
    useAuthMock.mockReturnValue({ user: null, loading: true })

    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>
    )

    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("redirects unauthenticated users to login", async () => {
    useAuthMock.mockReturnValue({ user: null, loading: false })

    const { container } = render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>
    )

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"))
    expect(container).toBeEmptyDOMElement()
  })

  it("shows email verification UI and resends verification", async () => {
    const currentUser = { uid: "1" }
    useAuthMock.mockReturnValue({
      user: { email: "user@example.com", emailVerified: false },
      loading: false,
    })
    getFirebaseAuthMock.mockReturnValue({ currentUser })

    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>
    )

    expect(screen.getByText("Verify your email")).toBeInTheDocument()
    expect(
      screen.getByText(/We sent a verification link to user@example.com/i)
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }))

    await waitFor(() =>
      expect(sendEmailVerificationMock).toHaveBeenCalledWith(currentUser)
    )
  })

  it("renders children for verified users", () => {
    useAuthMock.mockReturnValue({
      user: { email: "user@example.com", emailVerified: true },
      loading: false,
    })

    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>
    )

    expect(screen.getByText("Protected content")).toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })
})
