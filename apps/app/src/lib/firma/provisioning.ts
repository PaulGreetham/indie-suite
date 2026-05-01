import { AdminFieldValue, getAdminDb } from "@/lib/firebase/admin"
import { FirmaClient, type FirmaWorkspace } from "./server"

export type FirmaBusinessIntegration = {
  workspaceId: string
  workspaceApiKey?: string
  contractTemplateId?: string
  provisioningStatus?: "workspace_created" | "workspace_created_missing_key" | "manual_configured"
}

type TradingDetailsWithFirma = {
  ownerId?: string
  name?: string
  firma?: Partial<FirmaBusinessIntegration>
}

export async function ensureFirmaWorkspaceForBusiness(
  businessId: string,
  ownerId: string
): Promise<FirmaBusinessIntegration | null> {
  const db = getAdminDb()
  const ref = db.collection("settings_trading_details").doc(businessId)
  const snap = await ref.get()
  if (!snap.exists) throw new Error("business_not_found")

  const data = snap.data() as TradingDetailsWithFirma
  if (data.ownerId && data.ownerId !== ownerId) throw new Error("business_forbidden")

  const existing = normalizeFirmaIntegration(data.firma)
  if (existing?.workspaceId) return existing

  const companyApiKey = process.env.FIRMA_API_KEY
  if (!companyApiKey) return null

  const companyClient = new FirmaClient({ apiKey: companyApiKey })
  const workspaceName = `${data.name || "IndieSuite"} Workspace`
  const existingWorkspace = await findWorkspaceByName(companyClient, workspaceName)
  const created = existingWorkspace || await companyClient.createWorkspace(workspaceName)
  const workspace = await companyClient.getWorkspace(created.id).catch(() => created)
  const workspaceApiKey = getWorkspaceApiKey(workspace)

  const integration: FirmaBusinessIntegration = {
    workspaceId: created.id,
    provisioningStatus: workspaceApiKey ? "workspace_created" : "workspace_created_missing_key",
  }
  if (workspaceApiKey) integration.workspaceApiKey = workspaceApiKey

  await ref.update({
    firma: {
      ...toFirestoreObject(integration),
      createdAt: AdminFieldValue.serverTimestamp(),
      updatedAt: AdminFieldValue.serverTimestamp(),
    },
  })

  return integration
}

export async function getFirmaIntegrationForBusiness(
  businessId: string,
  ownerId: string
): Promise<FirmaBusinessIntegration | null> {
  const db = getAdminDb()
  const snap = await db.collection("settings_trading_details").doc(businessId).get()
  if (!snap.exists) return null
  const data = snap.data() as TradingDetailsWithFirma
  if (data.ownerId && data.ownerId !== ownerId) throw new Error("business_forbidden")
  return normalizeFirmaIntegration(data.firma)
}

function normalizeFirmaIntegration(value: TradingDetailsWithFirma["firma"]): FirmaBusinessIntegration | null {
  if (!value?.workspaceId) return null
  return {
    workspaceId: String(value.workspaceId),
    workspaceApiKey: value.workspaceApiKey ? String(value.workspaceApiKey) : undefined,
    contractTemplateId: value.contractTemplateId ? String(value.contractTemplateId) : undefined,
    provisioningStatus: value.provisioningStatus as FirmaBusinessIntegration["provisioningStatus"],
  }
}

function getWorkspaceApiKey(workspace: FirmaWorkspace): string | undefined {
  return workspace.api_key || workspace.apiKey
}

function toFirestoreObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined))
}

async function findWorkspaceByName(client: FirmaClient, name: string): Promise<FirmaWorkspace | null> {
  const list = await client.listWorkspaces().catch(() => null)
  const results = Array.isArray(list?.results) ? list.results : []
  return results.find((workspace) => workspace.name === name) || null
}
