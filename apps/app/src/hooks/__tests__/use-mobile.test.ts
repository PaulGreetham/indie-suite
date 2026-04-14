import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useIsMobile } from "../use-mobile"

type ChangeListener = () => void

describe("useIsMobile", () => {
  let listeners: ChangeListener[]

  beforeEach(() => {
    listeners = []

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1024,
    })

    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        matches: window.innerWidth < 768,
        media: "(max-width: 767px)",
        onchange: null,
        addEventListener: (_event: string, listener: ChangeListener) => {
          listeners.push(listener)
        },
        removeEventListener: (_event: string, listener: ChangeListener) => {
          listeners = listeners.filter((entry) => entry !== listener)
        },
        dispatchEvent: vi.fn(),
      }))
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns false on desktop widths", async () => {
    const { result } = renderHook(() => useIsMobile())

    await waitFor(() => expect(result.current).toBe(false))
  })

  it("updates to true after the media query change listener fires", async () => {
    const { result } = renderHook(() => useIsMobile())

    await waitFor(() => expect(result.current).toBe(false))

    window.innerWidth = 500
    listeners.forEach((listener) => listener())

    await waitFor(() => expect(result.current).toBe(true))
  })
})
