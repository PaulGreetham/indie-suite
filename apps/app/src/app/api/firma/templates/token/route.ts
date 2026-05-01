import { NextRequest } from "next/server"
import { getAdminAuth } from "@/lib/firebase/admin"
import { getFirmaIntegrationForBusiness } from "@/lib/firma/provisioning"
import { FirmaClient } from "@/lib/firma/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type TokenBody = {
  businessId?: string
  templateId?: string
}

export async function POST(req: NextRequest) {
  const decoded = await verifyRequest(req)
  if (!decoded?.uid) return Response.json({ error: "unauthorized" }, { status: 401 })

  const body = (await req.json().catch(() => null)) as TokenBody | null
  if (!body?.businessId) return Response.json({ error: "missing_businessId" }, { status: 400 })

  const integration = await getFirmaIntegrationForBusiness(body.businessId, decoded.uid)
  const templateId = body.templateId || integration?.contractTemplateId
  if (!integration?.workspaceApiKey) return Response.json({ error: "missing_workspace_api_key" }, { status: 400 })
  if (!templateId) return Response.json({ error: "missing_template" }, { status: 400 })
  if (integration.contractTemplateId && templateId !== integration.contractTemplateId) {
    return Response.json({ error: "template_forbidden" }, { status: 403 })
  }

  const firma = new FirmaClient({ apiKey: integration.workspaceApiKey })
  const token = await firma.generateTemplateToken(templateId).catch((err: unknown) => ({
    error: (err as Error)?.message || "Failed to generate Firma template token",
  }))
  if ((token as { error?: string }).error) {
    return Response.json({ error: "firma_template_token_failed", message: (token as { error: string }).error }, { status: 502 })
  }

  return Response.json({
    token: (token as { token?: string; jwt?: string }).token || (token as { jwt?: string }).jwt,
    expiresAt: (token as { expires_at?: string }).expires_at || null,
    templateId,
  })
}

async function verifyRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  return token ? await getAdminAuth().verifyIdToken(token).catch(() => null) : null
}
