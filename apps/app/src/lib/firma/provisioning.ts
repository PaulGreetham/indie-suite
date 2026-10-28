import { AdminFieldValue, getAdminDb } from "@/lib/firebase/admin"
import { HttpError } from "@/lib/server/auth"
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
  if (!snap.exists) throw new HttpError(404, "not_found")

  const data = snap.data() as TradingDetailsWithFirma
  if (data.ownerId !== ownerId) throw new HttpError(404, "not_found")

  const existing = normalizeFirmaIntegration(data.firma)
  if (existing?.workspaceId) {
    if (!existing.workspaceApiKey && process.env.FIRMA_API_KEY) {
      const companyClient = new FirmaClient({ apiKey: process.env.FIRMA_API_KEY })
      const workspace = await companyClient.getWorkspace(existing.workspaceId).catch(() => null)
      const workspaceApiKey = workspace ? getWorkspaceApiKey(workspace) : undefined
      if (workspaceApiKey) {
        await ref.update({
          "firma.workspaceApiKey": workspaceApiKey,
          "firma.provisioningStatus": "workspace_created",
          "firma.updatedAt": AdminFieldValue.serverTimestamp(),
        })
        return { ...existing, workspaceApiKey, provisioningStatus: "workspace_created" }
      }
    }
    return existing
  }

  const companyApiKey = process.env.FIRMA_API_KEY
  if (!companyApiKey) return null

  const companyClient = new FirmaClient({ apiKey: companyApiKey })
  // Always create a dedicated workspace; never attach an existing one by name (R-17).
  // The immutable businessId keeps names unique across tenants.
  const created = await companyClient.createWorkspace(`${data.name || "IndieSuite"} (${businessId})`)
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
  if (data.ownerId !== ownerId) throw new HttpError(404, "not_found")
  return normalizeFirmaIntegration(data.firma)
}

export async function saveFirmaContractTemplateForBusiness(
  businessId: string,
  ownerId: string,
  templateId: string
): Promise<void> {
  const db = getAdminDb()
  const ref = db.collection("settings_trading_details").doc(businessId)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpError(404, "not_found")

  const data = snap.data() as TradingDetailsWithFirma
  if (data.ownerId !== ownerId) throw new HttpError(404, "not_found")

  await ref.update({
    "firma.contractTemplateId": templateId,
    "firma.updatedAt": AdminFieldValue.serverTimestamp(),
  })
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
