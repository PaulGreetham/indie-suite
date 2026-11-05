import { render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { setDOMContentMock, setHTMLMock, mapOptionsMock, popupOptionsMock, themeState } = vi.hoisted(() => ({
  setDOMContentMock: vi.fn(),
  setHTMLMock: vi.fn(),
  mapOptionsMock: vi.fn(),
  popupOptionsMock: vi.fn(),
  themeState: { resolvedTheme: "dark" as string | undefined },
}))

vi.mock("next-themes", () => ({ useTheme: () => themeState }))

vi.mock("mapbox-gl", () => {
  class Popup {
    constructor(options: unknown) { popupOptionsMock(options) }
    setDOMContent(node: Node) { setDOMContentMock(node); return this }
    setHTML(html: string) { setHTMLMock(html); return this }
  }
  class Marker {
    setLngLat() { return this }
    setPopup() { return this }
    addTo() { return this }
  }
  class Map {
    constructor(options: unknown) { mapOptionsMock(options) }
    addControl() {}
    remove() {}
  }
  class NavigationControl {}
  return { default: { Map, Marker, Popup, NavigationControl, accessToken: "" } }
})

import { MapboxMap } from "../MapboxMap"

describe("MapboxMap (UI-F05 / S-11)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    themeState.resolvedTheme = "dark"
  })

  it("renders venue names and addresses as text, never as HTML", async () => {
    const name = '<img src=x onerror="alert(1)">'
    render(
      <MapboxMap
        center={{ lng: 0, lat: 51 }}
        marker={{ lng: 0, lat: 51, title: name, lines: ["<b>221B</b> Baker Street", "London NW1 6XE"] }}
      />
    )

    await waitFor(() => expect(setDOMContentMock).toHaveBeenCalled())
    expect(setHTMLMock).not.toHaveBeenCalled()

    const content = setDOMContentMock.mock.calls[0][0] as HTMLElement
    expect(content.querySelector("img")).toBeNull()
    expect(content.querySelector("b")).toBeNull()
    expect(Array.from(content.querySelectorAll("p")).map((p) => p.textContent)).toEqual([
      name,
      "<b>221B</b> Baker Street",
      "London NW1 6XE",
    ])
  })

  it("offers directions in Google Maps and uses the themed popup", async () => {
    render(
      <MapboxMap
        center={{ lng: 0, lat: 51 }}
        marker={{ lng: 0, lat: 51, title: "Home", lines: ["Rozenstraat 69"], mapsQuery: "Rozenstraat 69, Hilversum" }}
      />
    )

    await waitFor(() => expect(setDOMContentMock).toHaveBeenCalled())
    const link = (setDOMContentMock.mock.calls[0][0] as HTMLElement).querySelector("a")!
    expect(link.textContent).toBe("Open in Google Maps")
    expect(link.href).toBe("https://www.google.com/maps/search/?api=1&query=Rozenstraat%2069%2C%20Hilversum")
    expect(link.rel).toBe("noopener noreferrer")
    expect(popupOptionsMock).toHaveBeenCalledWith(expect.objectContaining({ className: "venue-popup" }))
  })

  it("matches the map style to the theme", async () => {
    const { unmount } = render(<MapboxMap center={{ lng: 0, lat: 51 }} />)
    await waitFor(() => expect(mapOptionsMock).toHaveBeenCalled())
    expect(mapOptionsMock.mock.calls[0][0]).toEqual(expect.objectContaining({ style: "mapbox://styles/mapbox/dark-v11" }))
    unmount()

    themeState.resolvedTheme = "light"
    render(<MapboxMap center={{ lng: 0, lat: 51 }} />)
    await waitFor(() => expect(mapOptionsMock).toHaveBeenCalledTimes(2))
    expect(mapOptionsMock.mock.calls[1][0]).toEqual(expect.objectContaining({ style: "mapbox://styles/mapbox/streets-v12" }))
  })
})
