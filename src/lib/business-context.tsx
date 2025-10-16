"use client"

import * as React from "react"

type BusinessContextType = {
  activeBusinessId: string | null
  setActiveBusinessId: (id: string | null) => void
  activeBusinessName: string | null
  setActiveBusinessName: (name: string | null) => void
}

const BusinessContext = React.createContext<BusinessContextType | null>(null)

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [activeBusinessId, setActiveBusinessId] = React.useState<string | null>(null)
  const [activeBusinessName, setActiveBusinessName] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const id = window.sessionStorage.getItem("activeBusinessId") || null
    const name = window.sessionStorage.getItem("activeBusinessName") || null
    setActiveBusinessId(id)
    setActiveBusinessName(name)
  }, [])

  const value = React.useMemo(
    () => ({ activeBusinessId, setActiveBusinessId: (id: string | null) => {
      setActiveBusinessId(id)
      if (typeof window !== "undefined") {
        if (id) window.sessionStorage.setItem("activeBusinessId", id)
        else window.sessionStorage.removeItem("activeBusinessId")
      }
    }, activeBusinessName, setActiveBusinessName: (name: string | null) => {
      setActiveBusinessName(name)
      if (typeof window !== "undefined") {
        if (name) window.sessionStorage.setItem("activeBusinessName", name)
        else window.sessionStorage.removeItem("activeBusinessName")
      }
    } }),
    [activeBusinessId, activeBusinessName]
  )

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export function useBusiness() {
  const ctx = React.useContext(BusinessContext)
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider")
  return ctx
}


