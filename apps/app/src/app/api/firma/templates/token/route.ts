import { NextRequest } from "next/server"
import { getFirmaIntegrationForBusiness } from "@/lib/firma/provisioning"
import { FirmaClient } from "@/lib/firma/server"
import { handleRouteError, requireUser } from "@/lib/server/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type TokenBody = {
  businessId?: string
  templateId?: string
}

export async function POST(req: NextRequest) {
  try {
    return await createToken(req)
  } catch (err) {
    return handleRouteError(err, "/api/firma/templates/token")
  }
}

async function createToken(req: NextRequest): Promise<Response> {
  const { uid } = await requireUser(req)

  const body = (await req.json().catch(() => null)) as TokenBody | null
  if (!body?.businessId) return Response.json({ error: "missing_businessId" }, { status: 400 })

  const integration = await getFirmaIntegrationForBusiness(body.businessId, uid)
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
    console.error("/api/firma/templates/token firma error:", (token as { error: string }).error)
    return Response.json({ error: "firma_template_token_failed" }, { status: 502 })
  }

  return Response.json({
    token: (token as { token?: string; jwt?: string }).token || (token as { jwt?: string }).jwt,
    expiresAt: (token as { expires_at?: string }).expires_at || null,
    templateId,
  })
}
