import { NextRequest } from "next/server"
import { getFirmaIntegrationForBusiness } from "@/lib/firma/provisioning"
import { handleRouteError, requireUser } from "@/lib/server/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { uid } = await requireUser(req)

    const businessId = req.nextUrl.searchParams.get("businessId")
    if (!businessId) return Response.json({ error: "missing_businessId" }, { status: 400 })

    // Read-only: workspaces are only created by the explicit templates/create POST (S-03)
    const integration = await getFirmaIntegrationForBusiness(businessId, uid)

    return Response.json({
      configured: Boolean(integration?.workspaceId && integration?.contractTemplateId),
      workspaceId: integration?.workspaceId || null,
      hasWorkspaceApiKey: Boolean(integration?.workspaceApiKey),
      contractTemplateId: integration?.contractTemplateId || null,
      provisioningStatus: integration?.provisioningStatus || null,
    })
  } catch (err) {
    return handleRouteError(err, "/api/firma/templates/status")
  }
}
