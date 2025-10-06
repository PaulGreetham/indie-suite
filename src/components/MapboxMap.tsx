"use client"

import { useEffect, useRef } from "react"
import type { Map } from "mapbox-gl"

export type MapboxMarker = {
  lng: number
  lat: number
  title?: string
  description?: string
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

  useEffect(() => {
    let map: Map | null = null
    let cleanup: (() => void) | undefined
    async function init() {
      const mapboxgl = (await import("mapbox-gl")).default
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY as string
      map = new mapboxgl.Map({
        container: containerRef.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [center.lng, center.lat],
        zoom,
      })
      map.addControl(new mapboxgl.NavigationControl(), "top-right")
      if (marker) {
        const m = new mapboxgl.Marker().setLngLat([marker.lng, marker.lat])
        if (marker.title || marker.description) {
          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<strong>${marker.title ?? ""}</strong><div>${marker.description ?? ""}</div>`
          )
          m.setPopup(popup)
        }
        m.addTo(map)
      }
      cleanup = () => map?.remove()
    }
    init()
    return () => cleanup?.()
  }, [center.lng, center.lat, zoom, marker, marker?.lng, marker?.lat, marker?.title, marker?.description])

  return <div ref={containerRef} className={className} style={{ minHeight: 360, borderRadius: 8, overflow: "hidden" }} />
}


