type FirmaClientOptions = {
  apiKey?: string
  baseUrl?: string
}

export type FirmaWorkspace = {
  id: string
  name?: string
  api_key?: string
  apiKey?: string
  protected?: boolean
  date_created?: string
  date_changed?: string
}

export type FirmaWorkspaceList = {
  results?: FirmaWorkspace[]
  pagination?: unknown
}

export type FirmaRecipient = {
  template_user_id?: string
  first_name: string
  last_name?: string
  email: string
  designation: "Signer"
  order: number
  company?: string
  custom_fields?: Record<string, string>
}

export type FirmaFieldOverride = {
  variable_name: string
  read_only: true
  read_only_value: string
}

export type CreateSigningRequestPayload = {
  name: string
  description?: string
  recipients: FirmaRecipient[]
  fields?: FirmaFieldOverride[]
}

export type FirmaSigningRequest = {
  id: string
  url?: string
  document_url?: string
  firmaUrl?: string
  status?: string
  recipients?: unknown[]
}

export type FirmaTemplate = {
  id: string
  name?: string
  description?: string | null
  document_url?: string
  recipients?: Array<{
    id?: string
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    designation?: string
    order?: number
  }>
  fields?: Array<{
    id?: string
    variable_name?: string | null
    read_only?: boolean
    required?: boolean
  }>
}

export type CreateTemplatePayload = {
  name: string
  description?: string
  document: string
  expiration_hours?: number
}

export type FirmaTemplateToken = {
  token?: string
  jwt?: string
  expires_at?: string
  jwt_record_id?: string
  jwt_id?: string
}

export class FirmaClient {
  private apiKey: string
  private baseUrl: string

  constructor(opts: FirmaClientOptions = {}) {
    const key =
      opts.apiKey ||
      process.env.FIRMA_WORKSPACE_API_KEY ||
      process.env.FIRMA_API_KEY ||
      process.env.NEXT_PUBLIC_FIRMA_API_KEY ||
      // handle mistakenly-named env with hyphen
      process.env["NEXT_PUBLIC_FIRMA_API-KEY"]
    if (!key) throw new Error("Missing FIRMA_WORKSPACE_API_KEY or FIRMA_API_KEY")
    this.apiKey = key
    // Per docs: https://api.firma.dev/functions/v1/signing-request-api
    this.baseUrl = (opts.baseUrl || "https://api.firma.dev/functions/v1/signing-request-api").replace(/\/$/, "")
  }

  getBaseUrl(): string { return this.baseUrl }

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

  async createWorkspace(name: string): Promise<FirmaWorkspace> {
    const res = await fetch(`${this.baseUrl}/workspaces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "x-api-key": this.apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`FIRMA_CREATE_WORKSPACE_ERROR ${res.status}: ${text}`)
    }
    return await res.json() as FirmaWorkspace
  }

  async listWorkspaces(): Promise<FirmaWorkspaceList> {
    const res = await fetch(`${this.baseUrl}/workspaces?page=1&page_size=100`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "x-api-key": this.apiKey,
        Accept: "application/json",
      },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`FIRMA_WORKSPACES_ERROR ${res.status}: ${text}`)
    }
    return await res.json() as FirmaWorkspaceList
  }

  async getWorkspace(id: string): Promise<FirmaWorkspace> {
    const res = await fetch(`${this.baseUrl}/workspaces/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "x-api-key": this.apiKey,
        Accept: "application/json",
      },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`FIRMA_WORKSPACE_ERROR ${res.status}: ${text}`)
    }
    return await res.json() as FirmaWorkspace
  }

  async getTemplate(id: string): Promise<FirmaTemplate> {
    const res = await fetch(`${this.baseUrl}/templates/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "x-api-key": this.apiKey,
        Accept: "application/json",
      },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`FIRMA_TEMPLATE_ERROR ${res.status}: ${text}`)
    }
    return await res.json() as FirmaTemplate
  }

  async createTemplate(payload: CreateTemplatePayload): Promise<FirmaTemplate> {
    const url = `${this.baseUrl}/templates`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "x-api-key": this.apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`FIRMA_CREATE_TEMPLATE_ERROR ${res.status} POST ${url}: ${body}`)
    }
    return await res.json() as FirmaTemplate
  }

  async generateTemplateToken(templateId: string): Promise<FirmaTemplateToken> {
    const url = `${this.baseUrl}/generate-template-token`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "x-api-key": this.apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify({ companies_workspaces_templates_id: templateId }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`FIRMA_TEMPLATE_TOKEN_ERROR ${res.status} POST ${url}: ${body}`)
    }
    return await res.json() as FirmaTemplateToken
  }

  async createSigningRequestFromTemplate(templateId: string, payload: CreateSigningRequestPayload): Promise<FirmaSigningRequest> {
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
      const body = await res.text().catch(() => "")
      throw new Error(`FIRMA_CREATE_ERROR ${res.status} POST ${url}: ${body}`)
    }
    const created = (await res.json()) as FirmaSigningRequest
    const firmaUrl = created.url || created.document_url
    return firmaUrl ? { ...created, firmaUrl, url: firmaUrl } : created
  }

  async sendSigningRequest(id: string): Promise<void> {
    const url = `${this.baseUrl}/signing-requests/${id}/send`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "x-api-key": this.apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify({ custom_message: "Please review and sign this contract." }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`FIRMA_SEND_ERROR ${res.status} POST ${url}: ${body}`)
    }
  }

  async updateSigningRequestRecipient(
    signingRequestId: string,
    recipient: FirmaRecipient & { id: string }
  ): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}/signing-requests/${signingRequestId}`
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "x-api-key": this.apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify({ recipient }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`FIRMA_UPDATE_RECIPIENT_ERROR ${res.status} PATCH ${url}: ${body}`)
    }
    return await res.json() as Record<string, unknown>
  }

  async getSigningRequest(id: string): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}/signing-requests/${id}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "x-api-key": this.apiKey,
        Accept: "application/json",
      },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`FIRMA_GET_SR_ERROR ${res.status} GET ${url}: ${body}`)
    }
    return (await res.json()) as Record<string, unknown>
  }
}

let singleton: FirmaClient | null = null
export function getFirmaClient(): FirmaClient {
  if (!singleton) singleton = new FirmaClient()
  return singleton
}


