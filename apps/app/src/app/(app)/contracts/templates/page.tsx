"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { FirmaTemplateEditor } from "@/components/firma/FirmaTemplateEditor"
import { CONTRACT_TEMPLATE_OPTIONS } from "@/lib/contracts/template-options"
import { useBusiness } from "@/lib/business-context"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { toast } from "sonner"

type TemplateStatus = {
  configured: boolean
  workspaceId: string | null
  hasWorkspaceApiKey: boolean
  contractTemplateId: string | null
  provisioningStatus: string | null
}

type TokenResponse = {
  token?: string
  expiresAt?: string | null
  templateId?: string
  error?: string
  message?: string
}

const FIELD_NAMES = [
  "event_id",
  "event_title",
  "event_start_date",
  "event_end_date",
  "event_notes",
  "customer_id",
  "customer_name",
  "customer_company",
  "customer_email",
  "customer_phone",
  "venue_id",
  "venue_name",
  "venue_address",
  "invoice_id",
  "invoice_number",
  "invoice_total",
  "invoice_deposit",
  "contract_terms",
  "contract_notes",
  "business_id",
]

async function getAuthToken() {
  const token = await getFirebaseAuth().currentUser?.getIdToken().catch(() => "")
  if (!token) throw new Error("Please sign in again")
  return token
}

export default function ContractTemplatesPage() {
  const { resolveActiveBusinessId, activeBusinessName } = useBusiness()
  const [businessId, setBusinessId] = React.useState<string>("")
  const [status, setStatus] = React.useState<TemplateStatus | null>(null)
  const [selectedTemplateKey, setSelectedTemplateKey] = React.useState(CONTRACT_TEMPLATE_OPTIONS[0]?.key || "")
  const [customName, setCustomName] = React.useState(CONTRACT_TEMPLATE_OPTIONS[0]?.name || "Contract Template")
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [jwt, setJwt] = React.useState<string>("")
  const [templateId, setTemplateId] = React.useState<string>("")
  const [loading, setLoading] = React.useState(true)
  const [creating, setCreating] = React.useState(false)
  const [opening, setOpening] = React.useState(false)

  const selectedTemplate = CONTRACT_TEMPLATE_OPTIONS.find((template) => template.key === selectedTemplateKey)

  const loadStatus = React.useCallback(async (id: string) => {
    const token = await getAuthToken()
    const res = await fetch(`/api/firma/templates/status?businessId=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = (await res.json().catch(() => ({}))) as TemplateStatus & { error?: string; message?: string }
    if (!res.ok) throw new Error(body.message || body.error || "Failed to load Firma template status")
    setStatus(body)
    setTemplateId(body.contractTemplateId || "")
  }, [])

  React.useEffect(() => {
    async function load() {
      const id = await resolveActiveBusinessId()
      setBusinessId(id)
      await loadStatus(id)
    }
    load().catch((err: unknown) => {
      toast.error((err as Error)?.message || "Failed to load contract templates")
    }).finally(() => setLoading(false))
  }, [loadStatus, resolveActiveBusinessId])

  async function openEditor(id = templateId) {
    if (!businessId || !id) return
    setOpening(true)
    try {
      const token = await getAuthToken()
      const res = await fetch("/api/firma/templates/token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ businessId, templateId: id }),
      })
      const body = (await res.json().catch(() => ({}))) as TokenResponse
      if (!res.ok || !body.token) throw new Error(body.message || body.error || "Failed to open Firma editor")
      setTemplateId(body.templateId || id)
      setJwt(body.token)
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to open Firma editor")
    } finally {
      setOpening(false)
    }
  }

  async function createTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!businessId) return toast.error("Select a business first")
    if (!selectedTemplateKey && !selectedFile) return toast.error("Choose a starter template or upload a PDF")

    setCreating(true)
    try {
      const token = await getAuthToken()
      const form = new FormData()
      form.set("businessId", businessId)
      form.set("name", customName || selectedTemplate?.name || "Contract Template")
      form.set("description", selectedTemplate?.description || `Contract template for ${activeBusinessName || "business"}`)
      if (selectedFile) form.set("document", selectedFile)
      else form.set("templateKey", selectedTemplateKey)

      const res = await fetch("/api/firma/templates/create", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const body = (await res.json().catch(() => ({}))) as { contractTemplateId?: string; error?: string; message?: string }
      if (!res.ok || !body.contractTemplateId) throw new Error(body.message || body.error || "Failed to create Firma template")

      toast.success("Contract template created")
      await loadStatus(businessId)
      await openEditor(body.contractTemplateId)
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to create Firma template")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-1 grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Contract Templates</h1>
        <p className="text-sm text-muted-foreground">
          Choose a starter contract for this business, then edit the fields and signing areas in Firma.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Active template
            <Badge variant={status?.configured ? "default" : "secondary"}>
              {status?.configured ? "Configured" : "Not configured"}
            </Badge>
          </CardTitle>
          <CardDescription>
            {businessId ? `Business: ${activeBusinessName || businessId}` : "No active business selected"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {loading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : (
            <>
              <div>Workspace: {status?.workspaceId || "Not created"}</div>
              <div>Template: {status?.contractTemplateId || "Not created"}</div>
              {!status?.hasWorkspaceApiKey ? (
                <div className="text-destructive">Workspace API key is missing. Firma may need the workspace key regenerated.</div>
              ) : null}
              {status?.contractTemplateId ? (
                <div>
                  <Button type="button" onClick={() => openEditor()} disabled={opening}>
                    {opening ? "Opening…" : "Open Template Editor"}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {!status?.contractTemplateId ? (
        <Card>
          <CardHeader>
            <CardTitle>Choose a starter template</CardTitle>
            <CardDescription>
              Start with one of IndieSuite&apos;s templates. You can place signature fields and edit layout in Firma after creation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={createTemplate}>
              <div className="grid gap-3 md:grid-cols-2">
                {CONTRACT_TEMPLATE_OPTIONS.map((template) => (
                  <button
                    key={template.key}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateKey(template.key)
                      setCustomName(template.name)
                      setSelectedFile(null)
                    }}
                    className={`rounded-lg border p-4 text-left transition-colors ${selectedTemplateKey === template.key && !selectedFile ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{template.description}</div>
                  </button>
                ))}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="template-name">Template name</Label>
                <Input id="template-name" value={customName} onChange={(event) => setCustomName(event.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="template-file">Optional custom PDF</Label>
                <Input
                  id="template-file"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null
                    setSelectedFile(file)
                    if (file) {
                      setSelectedTemplateKey("")
                      setCustomName(file.name.replace(/\.pdf$/i, "") || "Contract Template")
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Leave this empty to use the selected IndieSuite starter template.
                </p>
              </div>

              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create and Edit Template"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Field names IndieSuite fills</CardTitle>
          <CardDescription>
            Use these variable names on read-only text/date fields in Firma so contract generation can pre-fill them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {FIELD_NAMES.map((field) => (
              <code key={field} className="rounded bg-muted px-2 py-1 text-xs">{field}</code>
            ))}
          </div>
        </CardContent>
      </Card>

      {jwt && templateId ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit in Firma</CardTitle>
            <CardDescription>Save changes inside the embedded Firma editor before generating future contracts.</CardDescription>
          </CardHeader>
          <CardContent>
            <FirmaTemplateEditor
              jwt={jwt}
              templateId={templateId}
              onSave={() => toast.success("Firma template saved")}
              onError={(error) => toast.error((error as Error)?.message || "Firma editor error")}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
