export type LngLat = { lng: number; lat: number }

type GeocodeOptions = {
  requirePostcode?: string
  requireCity?: string
  requireCountry?: string
  countryCodeHint?: string // optional ISO-2 to bias the query
}

// Stricter geocoding that validates the result matches provided components.
// - Uses types=address and autocomplete=false
// - Validates place_type includes 'address'
// - Validates postcode/city/country if supplied
export async function geocodeAddress(query: string, opts?: GeocodeOptions): Promise<LngLat | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_API_KEY
  if (!token) return null

  // Require a reasonably complete address (street and city or postcode)
  const lowered = query.toLowerCase()
  const hasStreet = /\b(st|street|road|rd|avenue|ave|lane|ln|drive|dr|way|close|cl|place|pl|court|ct)\b/.test(lowered) || /\d+/.test(lowered)
  const hasCityOrPostcode = /(\b[a-z]{2,}\b.*\b[a-z]{2,}\b)/i.test(lowered) || /\d{3,}/.test(lowered)
  if (!hasStreet || !hasCityOrPostcode) return null

  const params = new URLSearchParams({
    access_token: token,
    limit: "1",
    types: "address",
    autocomplete: "false",
  })
  if (opts?.countryCodeHint) params.set("country", opts.countryCodeHint)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json().catch(() => null)) as
    | {
        features?: Array<{
          center: [number, number]
          place_type?: string[]
          relevance?: number
          context?: Array<{ id: string; text?: string; short_code?: string }>
          properties?: { postcode?: string }
        }>
      }
    | null
  const f = data?.features?.[0]
  if (!f) return null
  const isAddress = Array.isArray(f.place_type) && f.place_type.includes("address")
  if (!isAddress) return null

  // Validate components if provided
  const ctx = f.context ?? []
  const findCtx = (prefix: string) => ctx.find((c) => typeof c.id === "string" && c.id.startsWith(prefix))
  const normalize = (s?: string | null) => (s ?? "").toLowerCase().replace(/\s+/g, "")

  if (opts?.requirePostcode) {
    const postcodeCtx = findCtx("postcode")?.text ?? f.properties?.postcode
    if (normalize(postcodeCtx) !== normalize(opts.requirePostcode)) return null
  }
  if (opts?.requireCity) {
    const cityText = findCtx("place")?.text
    if (normalize(cityText) !== normalize(opts.requireCity)) return null
  }
  if (opts?.requireCountry) {
    const countryText = findCtx("country")?.text
    if (normalize(countryText) !== normalize(opts.requireCountry)) return null
  }

  const center = f.center
  if (!center) return null
  return { lng: center[0] ?? 0, lat: center[1] ?? 0 }
}


