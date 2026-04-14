import { beforeEach, describe, expect, it, vi } from "vitest"

const stripeCtorMock = vi.hoisted(() =>
  vi.fn().mockImplementation(function StripeMock(this: { secretKey: string }, secretKey: string) {
    this.secretKey = secretKey
  })
)

vi.mock("stripe", () => ({
  default: stripeCtorMock,
}))

describe("stripe server helpers", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    stripeCtorMock.mockClear()
  })

  it("maps plan aliases and billing intervals to configured price ids", async () => {
    vi.stubEnv("PRICE_PRO_MONTHLY", "price_pro_monthly")
    vi.stubEnv("PRICE_PRO_YEARLY", "price_pro_yearly")
    vi.stubEnv("PRICE_PORTFOLIO_MONTHLY", "price_portfolio_monthly")
    vi.stubEnv("PRICE_PORTFOLIO_YEARLY", "price_portfolio_yearly")
    vi.stubEnv("PRICE_AGENCY_MONTHLY", "price_agency_monthly")
    vi.stubEnv("PRICE_AGENCY_YEARLY", "price_agency_yearly")

    const { getPriceIdForPlan } = await import("../server")

    expect(getPriceIdForPlan("pro")).toBe("price_pro_monthly")
    expect(getPriceIdForPlan("pro", "yearly")).toBe("price_pro_yearly")
    expect(getPriceIdForPlan("portfolio")).toBe("price_portfolio_monthly")
    expect(getPriceIdForPlan("pro_plus", "yearly")).toBe("price_portfolio_yearly")
    expect(getPriceIdForPlan("agency")).toBe("price_agency_monthly")
    expect(getPriceIdForPlan("pro++", "yearly")).toBe("price_agency_yearly")
    expect(getPriceIdForPlan("unknown-plan")).toBeNull()
  })

  it("prefers explicit site url, then vercel url, then localhost", async () => {
    let mod = await import("../server")

    expect(mod.getAppBaseUrl()).toBe("http://localhost:3000")

    vi.resetModules()
    vi.stubEnv("VERCEL_URL", "indie-suite.vercel.app")
    mod = await import("../server")
    expect(mod.getAppBaseUrl()).toBe("https://indie-suite.vercel.app")

    vi.resetModules()
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.indiesuite.dev")
    vi.stubEnv("VERCEL_URL", "ignored.vercel.app")
    mod = await import("../server")
    expect(mod.getAppBaseUrl()).toBe("https://app.indiesuite.dev")
  })

  it("throws when the stripe secret key is missing", async () => {
    const { getStripeServer } = await import("../server")

    expect(() => getStripeServer()).toThrow("Missing STRIPE_SECRET_KEY env var")
  })

  it("creates and reuses a singleton stripe client", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123")

    const { getStripeServer } = await import("../server")
    const first = getStripeServer()
    const second = getStripeServer()

    expect(stripeCtorMock).toHaveBeenCalledTimes(1)
    expect(stripeCtorMock).toHaveBeenCalledWith("sk_test_123")
    expect(first).toBe(second)
  })
})
