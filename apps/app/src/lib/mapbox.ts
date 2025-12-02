export type LngLat = { lng: number; lat: number }

type GeocodeOptions = {
  requirePostcode?: string
  requireStreet?: string
  requireCity?: string
  requireCountry?: string
  countryCodeHint?: string
  hasHouseNumber?: boolean
  allowPOI?: boolean
}

export async function geocodeAddress(query: string, opts?: GeocodeOptions): Promise<LngLat | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_API_KEY
  if (!token) return null
  if (!opts?.requirePostcode) return null

  async function fetchFeature(types?: string, limit: number = 1) {
    const p = new URLSearchParams()
    p.set("access_token", token ?? "")
    p.set("limit", String(limit))
    if (types) p.set("types", types)
    p.set("autocomplete", "false")
    if (opts?.countryCodeHint) p.set("country", opts.countryCodeHint)
    if (!opts?.countryCodeHint && /[A-Z]{1,2}\d/.test(opts?.requirePostcode ?? "")) {
      p.set("country", "GB")
    }
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${p.toString()}`
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
    return (data?.features ?? [])
  }

  function validateFeature(f: {
    center: [number, number]
    place_type?: string[]
    relevance?: number
    context?: Array<{ id: string; text?: string; short_code?: string }>
    properties?: { postcode?: string }
  }): LngLat | null {
    const types = Array.isArray(f.place_type) ? f.place_type : []
    const isAddress = types.includes("address")
    const isPOI = types.includes("poi")
    const isPlaceLike = types.includes("place") || types.includes("locality") || types.includes("neighborhood") || types.includes("district")
    if (!(isAddress || isPOI || isPlaceLike)) return null

    const ctx = f.context ?? []
    const findCtx = (prefix: string) => ctx.find((c) => typeof c.id === "string" && c.id.startsWith(prefix))
    const normalize = (s?: string | null) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")
    const normalizeStreet = (s?: string | null) =>
      normalize(
        (s ?? "")
          .replace(/\bhigh\s*st\b/gi, "high street")
          .replace(/\bst\b/gi, "street")
          .replace(/\brd\b/gi, "road")
          .replace(/\bave\b/gi, "avenue")
      )

    const postcodeOk = (() => {
      if (!opts?.requirePostcode) return true
      const postcodeCtx = findCtx("postcode")?.text ?? f.properties?.postcode
      return normalize(postcodeCtx) === normalize(opts.requirePostcode)
    })()

    const streetOk = (() => {
      if (!opts?.requireStreet) return true
      const required = normalizeStreet(opts.requireStreet)
      const streetCtx = normalizeStreet(findCtx("street")?.text)
      const addressCtx = normalizeStreet(findCtx("address")?.text)
      const placeName = normalizeStreet((f as unknown as { place_name?: string }).place_name)
      const text = normalizeStreet((f as unknown as { text?: string }).text)
      return [streetCtx, addressCtx, placeName, text].some((v) => v && v.includes(required))
    })()

    const cityOk = (() => {
      if (!opts?.requireCity) return true
      const candidates: (string | undefined)[] = [
        findCtx("place")?.text,
        findCtx("locality")?.text,
        findCtx("district")?.text,
        findCtx("neighborhood")?.text,
      ]
      const target = normalize(opts.requireCity)
      return candidates.some((t) => normalize(t) === target)
    })()

    const isPostcodeType = types.includes("postcode")
    if (postcodeOk) {
      if (!streetOk) return null
    } else {
      if (!(streetOk && cityOk) && !isPostcodeType) return null
    }

    const center = f.center
    if (!center) return null
    return { lng: center[0] ?? 0, lat: center[1] ?? 0 }
  }

  const primaryTypes = opts?.allowPOI
    ? "poi,address,place,locality,neighborhood"
    : (opts?.hasHouseNumber ? "address" : "address,place,locality,neighborhood")
  const primary = await fetchFeature(primaryTypes, 5)
  for (const f of primary ?? []) {
    const v = validateFeature(f)
    if (v) return v
  }

  const fallback = await fetchFeature(undefined, 5)
  for (const f of fallback ?? []) {
    const v = validateFeature(f)
    if (v) return v
  }

  return null
}


