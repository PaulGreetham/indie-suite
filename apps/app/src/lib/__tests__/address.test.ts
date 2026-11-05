import { describe, expect, it } from "vitest"
import { formatAddressLines } from "@/lib/address"

describe("formatAddressLines", () => {
  it("writes Dutch addresses with the number after the street and the postcode first", () => {
    expect(
      formatAddressLines({ building: "69", street: "Rozenstraat", city: "Hilversum", area: "Noord-Holland", postcode: "1214BR", country: "Netherlands" })
    ).toEqual(["Rozenstraat 69", "1214BR Hilversum, Noord-Holland", "Netherlands"])
  })

  it("writes UK addresses with the number first and the postcode last", () => {
    expect(
      formatAddressLines({ building: "221B", street: "Baker Street", city: "London", area: "Greater London", postcode: "NW1 6XE", country: "United Kingdom" })
    ).toEqual(["221B Baker Street", "London, Greater London NW1 6XE", "United Kingdom"])
  })

  it("doesn't repeat a number that was also typed into the street", () => {
    expect(formatAddressLines({ building: "69", street: "Rozenstraat 69", country: "Nederland" })).toEqual([
      "Rozenstraat 69",
      "Nederland",
    ])
    expect(formatAddressLines({ building: "69", street: "69 Rozenstraat", country: "UK" })).toEqual([
      "69 Rozenstraat",
      "UK",
    ])
  })

  it("still adds a number that only looks similar to part of the street", () => {
    expect(formatAddressLines({ building: "6", street: "Rozenstraat 69", country: "NL" })[0]).toBe("Rozenstraat 69 6")
  })

  it("keeps building names and recognises country codes and native names", () => {
    expect(formatAddressLines({ building: "The Barn", street: "Mill Lane", country: "England" })[0]).toBe("The Barn Mill Lane")
    expect(formatAddressLines({ building: "12", street: "Hauptstraße", postcode: "10115", city: "Berlin", country: "DE" })).toEqual([
      "Hauptstraße 12",
      "10115 Berlin",
      "DE",
    ])
  })

  it("defaults to UK order when the country is missing or unknown", () => {
    expect(formatAddressLines({ building: "69", street: "Rozenstraat", city: "Hilversum", postcode: "1214BR" })).toEqual([
      "69 Rozenstraat",
      "Hilversum 1214BR",
    ])
  })

  it("returns nothing for an empty address", () => {
    expect(formatAddressLines(null)).toEqual([])
    expect(formatAddressLines({ building: " ", street: "" })).toEqual([])
  })
})
