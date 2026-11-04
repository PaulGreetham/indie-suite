"use client"

import * as React from "react"
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client"
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore"
import { isOwnBusiness } from "@/lib/firebase/user-settings"

// "none" means the user has no business details yet, so pages that need one can say so up front
export type BusinessStatus = "loading" | "none" | "ready"

type BusinessContextType = {
  businessStatus: BusinessStatus
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
  const [businessStatus, setBusinessStatus] = React.useState<BusinessStatus>("loading")

  // Re-checked when a business is added or deleted ("business-updated"). A failed check counts as
  // "ready" so a network error never blocks a page; saves still require a business either way.
  React.useEffect(() => {
    let cancelled = false
    async function check() {
      const uid = getFirebaseAuth().currentUser?.uid
      if (!uid) return
      const snap = await getDocs(query(
        collection(getFirestoreDb(), "settings_trading_details"),
        where("ownerId", "==", uid),
        limit(1),
      ))
      if (!cancelled) setBusinessStatus(snap.empty ? "none" : "ready")
    }
    const run = () => { check().catch(() => { if (!cancelled) setBusinessStatus("ready") }) }
    const onUpdated = (event: Event) => {
      // A create sends the new business's name; show it as ready at once rather than after the re-check
      if ((event as CustomEvent<{ name?: string }>).detail?.name) setBusinessStatus("ready")
      run()
    }
    run()
    window.addEventListener("business-updated", onUpdated)
    return () => {
      cancelled = true
      window.removeEventListener("business-updated", onUpdated)
    }
  }, [])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const id = window.sessionStorage.getItem("activeBusinessId") || null
    const name = window.sessionStorage.getItem("activeBusinessName") || null
    if (!id) return
    // Only adopt the stored id once it is confirmed to be one of the user's businesses
    let cancelled = false
    isOwnBusiness(id).then((owned) => {
      if (cancelled) return
      if (owned) {
        setActiveBusinessId(id)
        setActiveBusinessName(name)
      } else {
        window.sessionStorage.removeItem("activeBusinessId")
        window.sessionStorage.removeItem("activeBusinessName")
      }
    })
    return () => { cancelled = true }
  }, [])

  const resolveActiveBusinessId = React.useCallback(async (): Promise<string> => {
    // 1) In-memory
    if (activeBusinessId) return activeBusinessId
    // 2) Session storage, only if it is still one of the user's businesses
    if (typeof window !== "undefined") {
      const sid = window.sessionStorage.getItem("activeBusinessId")
      if (sid && await isOwnBusiness(sid)) {
        setActiveBusinessId(sid)
        return sid
      }
      if (sid) {
        window.sessionStorage.removeItem("activeBusinessId")
        window.sessionStorage.removeItem("activeBusinessName")
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
  }, [activeBusinessId])

  const value = React.useMemo(
    () => ({ businessStatus, activeBusinessId, setActiveBusinessId: (id: string | null) => {
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
    [businessStatus, activeBusinessId, activeBusinessName, resolveActiveBusinessId]
  )

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export function useBusiness() {
  const ctx = React.useContext(BusinessContext)
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider")
  return ctx
}


