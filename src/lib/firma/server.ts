type FirmaClientOptions = {
  apiKey?: string
  baseUrl?: string
}

export class FirmaClient {
  private apiKey: string
  private baseUrl: string

  constructor(opts: FirmaClientOptions = {}) {
    const key =
      opts.apiKey ||
      process.env.FIRMA_API_KEY ||
      process.env.NEXT_PUBLIC_FIRMA_API_KEY ||
      // handle mistakenly-named env with hyphen
      process.env["NEXT_PUBLIC_FIRMA_API-KEY"]
    if (!key) throw new Error("Missing NEXT_PUBLIC_FIRMA_API_KEY")
    this.apiKey = key
    // Per docs: https://api.firma.dev/functions/v1/signing-request-api
    this.baseUrl = (opts.baseUrl || "https://api.firma.dev/functions/v1/signing-request-api").replace(/\/$/, "")
  }

  async listTemplates(): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/templates`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "x-api-key": this.apiKey,
        Accept: "application/json",
      },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`FIRMA_TEMPLATES_ERROR ${res.status}: ${text}`)
    }
    return await res.json()
  }

  async createSigningRequestFromTemplate(templateId: string, payload: Record<string, unknown>): Promise<{ id: string; url?: string }> {
    // Per API: create signing request from a template via top-level endpoint with template_id in body
    const url = `${this.baseUrl}/signing-requests`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "x-api-key": this.apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify({ template_id: templateId, ...payload }),
    })
    if (!res.ok) {
      let body = ""
      try { body = await res.text() } catch {}
      throw new Error(`FIRMA_CREATE_ERROR ${res.status} POST ${url}: ${body}`)
    }
    return (await res.json()) as { id: string; url?: string }
  }
}

let singleton: FirmaClient | null = null
export function getFirmaClient(): FirmaClient {
  if (!singleton) singleton = new FirmaClient()
  return singleton
}


