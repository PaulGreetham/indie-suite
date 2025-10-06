export type LngLat = { lng: number; lat: number }

export async function geocodeAddress(query: string): Promise<LngLat | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_API_KEY
  if (!token) return null
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json().catch(() => null) as { features?: { center: [number, number] }[] } | null
  const center = data?.features?.[0]?.center
  if (!center) return null
  return { lng: center[0] ?? 0, lat: center[1] ?? 0 }
}


