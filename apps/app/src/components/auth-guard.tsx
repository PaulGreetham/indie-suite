"use client"

import { useAuth } from "@/lib/firebase/auth-context"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { sendEmailVerification } from "firebase/auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!user.emailVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6">
          <p className="text-lg font-semibold mb-2">Verify your email</p>
          <p className="text-sm text-muted-foreground mb-4">We sent a verification link to {user.email}. Please verify your account, then refresh this page.</p>
          <button
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground h-9 px-4 py-2"
            onClick={async () => {
              const u = getFirebaseAuth().currentUser
              if (u) await sendEmailVerification(u)
            }}
          >
            Resend verification email
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
