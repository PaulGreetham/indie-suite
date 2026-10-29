import { NextRequest } from "next/server"
import { ensureFirmaWorkspaceForBusiness, saveFirmaContractTemplateForBusiness } from "@/lib/firma/provisioning"
import { FirmaClient } from "@/lib/firma/server"
import { getContractTemplateOption } from "@/lib/contracts/template-options"
import { ContractStarterTemplatePdf } from "@/components/pdf/ContractStarterTemplatePdf"
import { renderToBuffer } from "@react-pdf/renderer"
import * as React from "react"
import { handleRouteError, requireActiveUser } from "@/lib/server/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Below Vercel's 4.5 MB request body limit, so oversized uploads get a clear error
const MAX_TEMPLATE_BYTES = 4 * 1024 * 1024
const PDF_MAGIC = Buffer.from("%PDF-")

export async function POST(req: NextRequest) {
  try {
    return await createTemplate(req)
  } catch (err) {
    return handleRouteError(err, "/api/firma/templates/create")
  }
}

async function createTemplate(req: NextRequest): Promise<Response> {
  const { uid } = await requireActiveUser(req)

  const form = await req.formData().catch(() => null)
  if (!form) return Response.json({ error: "bad_request" }, { status: 400 })

  const businessId = String(form.get("businessId") || "")
  const name = String(form.get("name") || "Contract Template").trim().slice(0, 200)
  const description = String(form.get("description") || "").trim().slice(0, 1000)
  const templateKey = String(form.get("templateKey") || "").trim()
  const document = form.get("document")

  if (!businessId) return Response.json({ error: "missing_businessId" }, { status: 400 })
  if (!name) return Response.json({ error: "missing_name" }, { status: 400 })
  if (!templateKey && !(document instanceof File)) return Response.json({ error: "missing_document" }, { status: 400 })
  if (document instanceof File && document.type !== "application/pdf") return Response.json({ error: "invalid_document_type" }, { status: 400 })
  if (document instanceof File && document.size > MAX_TEMPLATE_BYTES) return Response.json({ error: "document_too_large" }, { status: 400 })

  // Validate the document before provisioning, so a rejected upload never creates a Firma workspace (S-03, S-10)
  const bytes = await getTemplatePdfBytes({ document, templateKey })
  if (!bytes) return Response.json({ error: "invalid_template" }, { status: 400 })
  if (document instanceof File && !bytes.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    return Response.json({ error: "invalid_document_type" }, { status: 400 })
  }

  const integration = await ensureFirmaWorkspaceForBusiness(businessId, uid)
  if (!integration?.workspaceApiKey) {
    return Response.json({
      error: "firma_workspace_not_ready",
      message: "Firma workspace was created but did not return a workspace API key.",
    }, { status: 500 })
  }

  const firma = new FirmaClient({ apiKey: integration.workspaceApiKey })
  const template = await firma.createTemplate({
    name,
    description: description || undefined,
    document: bytes.toString("base64"),
  }).catch((err: unknown) => ({ error: (err as Error)?.message || "Failed to create Firma template" }))

  if ((template as { error?: string }).error) {
    console.error("/api/firma/templates/create firma error:", (template as { error: string }).error)
    return Response.json({ error: "firma_template_create_failed" }, { status: 502 })
  }

  await saveFirmaContractTemplateForBusiness(businessId, uid, (template as { id: string }).id)

  return Response.json({
    template,
    contractTemplateId: (template as { id: string }).id,
    workspaceId: integration.workspaceId,
  }, { status: 200 })
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
