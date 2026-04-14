import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { pushMock, signInMock, sendPasswordResetMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  signInMock: vi.fn(),
  sendPasswordResetMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("@/lib/firebase/auth", () => ({
  emailPasswordSignIn: signInMock,
  sendPasswordReset: sendPasswordResetMock,
}))

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({
    open,
    children,
  }: {
    open?: boolean
    children: React.ReactNode
  }) => (open ? <div>{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: () => void | Promise<void>
  }) => <button type="button" onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}))

import { LoginForm } from "../login-form"

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("submits credentials and redirects on success", async () => {
    signInMock.mockResolvedValue(undefined)

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Login" }))

    await waitFor(() =>
      expect(signInMock).toHaveBeenCalledWith("user@example.com", "secret")
    )
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/dashboard/overview")
    )
  })

  it("shows an error message when login fails", async () => {
    signInMock.mockRejectedValue(new Error("Invalid credentials"))

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Login" }))

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument()
  })

  it("prefills and submits the password reset dialog", async () => {
    sendPasswordResetMock.mockResolvedValue(undefined)

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "reset@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Forgot your password?" }))

    expect(screen.getByText("Reset your password")).toBeInTheDocument()
    expect(screen.getAllByDisplayValue("reset@example.com")).toHaveLength(2)

    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }))

    await waitFor(() =>
      expect(sendPasswordResetMock).toHaveBeenCalledWith("reset@example.com")
    )
    expect(
      await screen.findByText("If an account exists, a reset link has been sent.")
    ).toBeInTheDocument()
  })
})
