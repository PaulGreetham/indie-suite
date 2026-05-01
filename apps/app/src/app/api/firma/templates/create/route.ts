import { NextRequest } from "next/server"
import { getAdminAuth } from "@/lib/firebase/admin"
import { ensureFirmaWorkspaceForBusiness, saveFirmaContractTemplateForBusiness } from "@/lib/firma/provisioning"
import { FirmaClient } from "@/lib/firma/server"
import { getContractTemplateOption } from "@/lib/contracts/template-options"
import { ContractStarterTemplatePdf } from "@/components/pdf/ContractStarterTemplatePdf"
import { renderToBuffer } from "@react-pdf/renderer"
import * as React from "react"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_TEMPLATE_BYTES = 20 * 1024 * 1024

export async function POST(req: NextRequest) {
  const decoded = await verifyRequest(req)
  if (!decoded?.uid) return Response.json({ error: "unauthorized" }, { status: 401 })

  const form = await req.formData().catch(() => null)
  if (!form) return Response.json({ error: "bad_request" }, { status: 400 })

  const businessId = String(form.get("businessId") || "")
  const name = String(form.get("name") || "Contract Template").trim()
  const description = String(form.get("description") || "").trim()
  const templateKey = String(form.get("templateKey") || "").trim()
  const document = form.get("document")

  if (!businessId) return Response.json({ error: "missing_businessId" }, { status: 400 })
  if (!name) return Response.json({ error: "missing_name" }, { status: 400 })
  if (!templateKey && !(document instanceof File)) return Response.json({ error: "missing_document" }, { status: 400 })
  if (document instanceof File && document.type && document.type !== "application/pdf") return Response.json({ error: "invalid_document_type" }, { status: 400 })
  if (document instanceof File && document.size > MAX_TEMPLATE_BYTES) return Response.json({ error: "document_too_large" }, { status: 400 })

  const integration = await ensureFirmaWorkspaceForBusiness(businessId, decoded.uid)
  if (!integration?.workspaceApiKey) {
    return Response.json({
      error: "firma_workspace_not_ready",
      message: "Firma workspace was created but did not return a workspace API key.",
    }, { status: 500 })
  }

  const bytes = await getTemplatePdfBytes({ document, templateKey })
  if (!bytes) return Response.json({ error: "invalid_template" }, { status: 400 })

  const firma = new FirmaClient({ apiKey: integration.workspaceApiKey })
  const template = await firma.createTemplate({
    name,
    description: description || undefined,
    document: bytes.toString("base64"),
  }).catch((err: unknown) => ({ error: (err as Error)?.message || "Failed to create Firma template" }))

  if ((template as { error?: string }).error) {
    return Response.json({ error: "firma_template_create_failed", message: (template as { error: string }).error }, { status: 502 })
  }

  await saveFirmaContractTemplateForBusiness(businessId, decoded.uid, (template as { id: string }).id)

  return Response.json({
    template,
    contractTemplateId: (template as { id: string }).id,
    workspaceId: integration.workspaceId,
  }, { status: 200 })
}

async function verifyRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  return token ? await getAdminAuth().verifyIdToken(token).catch(() => null) : null
}

async function getTemplatePdfBytes({
  document,
  templateKey,
}: {
  document: FormDataEntryValue | null
  templateKey: string
}): Promise<Buffer | null> {
  if (document instanceof File) return Buffer.from(await document.arrayBuffer())

  const option = getContractTemplateOption(templateKey)
  if (!option) return null

  const rendered = await renderToBuffer(React.createElement(ContractStarterTemplatePdf))
  return Buffer.isBuffer(rendered) ? rendered : Buffer.from(rendered)
}
