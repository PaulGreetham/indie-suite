"use client"

import * as React from "react"
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client"
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore"

type BusinessContextType = {
  activeBusinessId: string | null
  setActiveBusinessId: (id: string | null) => void
  activeBusinessName: string | null
  setActiveBusinessName: (name: string | null) => void
  resolveActiveBusinessId: () => Promise<string>
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

  async function resolveActiveBusinessId(): Promise<string> {
    // 1) In-memory
    if (activeBusinessId) return activeBusinessId
    // 2) Session storage
    if (typeof window !== "undefined") {
      const sid = window.sessionStorage.getItem("activeBusinessId")
      if (sid) {
        setActiveBusinessId(sid)
        return sid
      }
    }
    // 3) Fallback to the latest Trading Details in Firestore
    const auth = getFirebaseAuth()
    const uid = auth.currentUser?.uid
    if (!uid) throw new Error("AUTH_REQUIRED")
    const db = getFirestoreDb()
    const snap = await getDocs(query(
      collection(db, "settings_trading_details"),
      where("ownerId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(1),
    ))
    const id = snap.docs[0]?.id
    if (!id) throw new Error("BUSINESS_REQUIRED")
    setActiveBusinessId(id)
    const name = String((snap.docs[0].data() as { name?: string }).name || "")
    setActiveBusinessName(name || null)
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("activeBusinessId", id)
      if (name) window.sessionStorage.setItem("activeBusinessName", name)
    }
    return id
  }

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
    }, resolveActiveBusinessId }),
    [activeBusinessId, activeBusinessName]
  )

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export function useBusiness() {
  const ctx = React.useContext(BusinessContext)
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider")
  return ctx
}


