import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

const { signUpMock, getFirebaseAuthMock, sendEmailVerificationMock, getSearchParamMock } =
  vi.hoisted(() => ({
    signUpMock: vi.fn(),
    getFirebaseAuthMock: vi.fn(),
    sendEmailVerificationMock: vi.fn(),
    getSearchParamMock: vi.fn(),
  }))

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: getSearchParamMock,
  }),
}))

vi.mock("@/lib/firebase/auth", () => ({
  emailPasswordSignUp: signUpMock,
}))

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: getFirebaseAuthMock,
}))

vi.mock("firebase/auth", () => ({
  sendEmailVerification: sendEmailVerificationMock,
}))

import { SignupForm } from "../signup-form"

describe("SignupForm", () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    getSearchParamMock.mockReturnValue(null)
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "http://localhost:3000/" },
    })
  })

  afterAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    })
  })

  it("blocks submission when passwords do not match", async () => {
    render(<SignupForm />)

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    })
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "different" },
    })
    fireEvent.submit(screen.getByRole("button", { name: "Sign up" }).closest("form")!)

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument()
    expect(signUpMock).not.toHaveBeenCalled()
  })

  it("signs up, sends verification, and redirects with plan params", async () => {
    const currentUser = { uid: "1", email: "user@example.com" }

    getSearchParamMock.mockImplementation((key: string) => {
      if (key === "plan") return "agency"
      if (key === "interval") return "yearly"
      return null
    })
    signUpMock.mockResolvedValue(undefined)
    getFirebaseAuthMock.mockReturnValue({ currentUser })
    sendEmailVerificationMock.mockResolvedValue(undefined)

    render(<SignupForm />)

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Jane Doe" },
    })
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    })
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "secret" },
    })
    fireEvent.submit(screen.getByRole("button", { name: "Sign up" }).closest("form")!)

    await waitFor(() =>
      expect(signUpMock).toHaveBeenCalledWith("user@example.com", "secret")
    )
    await waitFor(() =>
      expect(sendEmailVerificationMock).toHaveBeenCalledWith(currentUser)
    )
    await waitFor(() =>
      expect(window.location.href).toContain(
        "/signup/verified?plan=agency&interval=yearly"
      )
    )
  })

  it("shows the auth error when signup fails", async () => {
    signUpMock.mockRejectedValue(new Error("Signup failed"))
    getFirebaseAuthMock.mockReturnValue({ currentUser: null })
    getSearchParamMock.mockReturnValue(null)

    render(<SignupForm />)

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Jane Doe" },
    })
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    })
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "secret" },
    })
    fireEvent.submit(screen.getByRole("button", { name: "Sign up" }).closest("form")!)

    expect(await screen.findByText("Signup failed")).toBeInTheDocument()
  })
})
