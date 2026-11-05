export type Address = {
  building?: string | null
  street?: string | null
  city?: string | null
  area?: string | null
  postcode?: string | null
  country?: string | null
}

// Countries that write the house number after the street and the postcode before the town
// ("Rozenstraat 69", "1214 BR Hilversum"). Everywhere else gets the UK order ("69 Rozenstraat",
// "Hilversum 1214 BR"). Country is free text, so common names, native names and codes are listed.
const CONTINENTAL_ORDER = new Set([
  "netherlands", "the netherlands", "nederland", "holland", "nl",
  "germany", "deutschland", "de",
  "belgium", "belgië", "belgie", "belgique", "be",
  "austria", "österreich", "osterreich", "at",
  "switzerland", "schweiz", "suisse", "svizzera", "ch",
  "luxembourg", "lu",
  "denmark", "danmark", "dk",
  "norway", "norge", "no",
  "sweden", "sverige", "se",
  "finland", "suomi", "fi",
  "iceland", "is",
  "italy", "italia", "it",
  "spain", "españa", "espana", "es",
  "portugal", "pt",
  "poland", "polska", "pl",
  "czechia", "czech republic", "česko", "cesko", "cz",
  "slovakia", "slovensko", "sk",
  "slovenia", "slovenija", "si",
  "croatia", "hrvatska", "hr",
  "hungary", "magyarország", "magyarorszag", "hu",
])

const clean = (value?: string | null) => value?.trim() ?? ""

function usesContinentalOrder(country: string): boolean {
  return CONTINENTAL_ORDER.has(country.toLowerCase().replace(/\.$/, ""))
}

// The building number is often typed into the street field as well ("69" + "Rozenstraat 69")
function streetIncludes(street: string, building: string): boolean {
  const escaped = building.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(^|\\s)${escaped}(\\s|,|$)`, "i").test(street)
}

// An address as it's written on an envelope in its own country: street line, place line, country
export function formatAddressLines(address?: Address | null): string[] {
  if (!address) return []
  const building = clean(address.building)
  const street = clean(address.street)
  const city = clean(address.city)
  const area = clean(address.area)
  const postcode = clean(address.postcode)
  const country = clean(address.country)
  const continental = usesContinentalOrder(country)

  const number = building && street && streetIncludes(street, building) ? "" : building
  const streetLine = (continental ? [street, number] : [number, street]).filter(Boolean).join(" ")
  const town = (continental ? [postcode, city] : [city]).filter(Boolean).join(" ")
  const placeLine = continental
    ? [town, area].filter(Boolean).join(", ")
    : [[town, area].filter(Boolean).join(", "), postcode].filter(Boolean).join(" ")

  return [streetLine, placeLine, country].filter(Boolean)
}
