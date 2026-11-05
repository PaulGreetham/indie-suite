"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import type { Map } from "mapbox-gl"

export type MapboxMarker = {
  lng: number
  lat: number
  title?: string
  /** Address lines, shown one per line in the popup */
  lines?: string[]
  /** What to search for in Google Maps; the popup offers no maps link without it */
  mapsQuery?: string
}

const MAP_STYLES = {
  light: "mapbox://styles/mapbox/streets-v12",
  dark: "mapbox://styles/mapbox/dark-v11",
}

// Venue names and addresses are user input, so they go in as text nodes, never as HTML (S-11)
function popupContent(marker: MapboxMarker): HTMLElement {
  const content = document.createElement("div")
  if (marker.title) {
    const title = document.createElement("p")
    title.className = "text-sm font-semibold leading-snug"
    title.textContent = marker.title
    content.appendChild(title)
  }
  for (const line of marker.lines ?? []) {
    const text = document.createElement("p")
    text.className = "text-sm leading-snug text-muted-foreground"
    text.textContent = line
    content.appendChild(text)
  }
  if (marker.mapsQuery) {
    const link = document.createElement("a")
    link.className = "mt-2 inline-block text-sm font-medium underline underline-offset-4"
    link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(marker.mapsQuery)}`
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    link.textContent = "Open in Google Maps"
    content.appendChild(link)
  }
  return content
}

export function MapboxMap({
  center,
  zoom = 12,
  marker,
  className,
}: {
  center: { lng: number; lat: number }
  zoom?: number
  marker?: MapboxMarker
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { resolvedTheme } = useTheme()
  const style = resolvedTheme === "dark" ? MAP_STYLES.dark : MAP_STYLES.light
  // The marker prop is a new object on every parent render, so the map is keyed on its values instead
  const markerKey = marker ? JSON.stringify(marker) : ""

  useEffect(() => {
    const current: MapboxMarker | undefined = markerKey ? JSON.parse(markerKey) : undefined
    let map: Map | null = null
    let cancelled = false
    async function init() {
      const mapboxgl = (await import("mapbox-gl")).default
      if (cancelled || !containerRef.current) return
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY as string
      map = new mapboxgl.Map({
        container: containerRef.current,
        style,
        center: [center.lng, center.lat],
        zoom,
      })
      map.addControl(new mapboxgl.NavigationControl(), "top-right")
      if (current) {
        const brand = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#fcf300"
        const pin = new mapboxgl.Marker({ color: brand }).setLngLat([current.lng, current.lat])
        if (current.title || current.lines?.length) {
          // "venue-popup" picks up the themed styles in globals.css
          pin.setPopup(
            new mapboxgl.Popup({ offset: 25, maxWidth: "280px", className: "venue-popup" }).setDOMContent(popupContent(current))
          )
        }
        pin.addTo(map)
      }
    }
    init()
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [center.lng, center.lat, zoom, markerKey, style])

  return <div ref={containerRef} className={className} style={{ minHeight: 360, borderRadius: 8, overflow: "hidden" }} />
}
