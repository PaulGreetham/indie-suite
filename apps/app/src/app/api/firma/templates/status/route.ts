import { NextRequest } from "next/server"
import { getAdminAuth } from "@/lib/firebase/admin"
import { ensureFirmaWorkspaceForBusiness } from "@/lib/firma/provisioning"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const decoded = await verifyRequest(req)
  if (!decoded?.uid) return Response.json({ error: "unauthorized" }, { status: 401 })

  const businessId = req.nextUrl.searchParams.get("businessId")
  if (!businessId) return Response.json({ error: "missing_businessId" }, { status: 400 })

  const integration = await ensureFirmaWorkspaceForBusiness(businessId, decoded.uid).catch((err: unknown) => {
    const message = (err as Error)?.message || "Failed to load Firma template status"
    return { error: message }
  })
  if ((integration as { error?: string } | null)?.error) {
    return Response.json({ error: "firma_status_failed", message: (integration as { error: string }).error }, { status: 500 })
  }

  return Response.json({
    configured: Boolean(integration?.workspaceId && integration?.contractTemplateId),
    workspaceId: integration?.workspaceId || null,
    hasWorkspaceApiKey: Boolean(integration?.workspaceApiKey),
    contractTemplateId: integration?.contractTemplateId || null,
    provisioningStatus: integration?.provisioningStatus || null,
  })
}

async function verifyRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  return token ? await getAdminAuth().verifyIdToken(token).catch(() => null) : null
}
