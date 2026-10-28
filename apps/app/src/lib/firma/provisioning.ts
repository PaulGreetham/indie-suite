import { AdminFieldValue, getAdminDb } from "@/lib/firebase/admin"
import { HttpError } from "@/lib/server/auth"
import { FirmaClient, type FirmaWorkspace } from "./server"

export type FirmaBusinessIntegration = {
  workspaceId: string
  workspaceApiKey?: string
  contractTemplateId?: string
  provisioningStatus?: "workspace_created" | "workspace_created_missing_key" | "manual_configured"
}

type TradingDetails = {
  ownerId?: string
  name?: string
}

// Server-only collection keyed by businessId. Docs deliberately have no ownerId, so client rules never match
// (R-07, R-01c). The legacy client-writable settings_trading_details.firma field is never read (R-17b).
export const FIRMA_INTEGRATIONS_COLLECTION = "integrations_firma"

function integrationRef(businessId: string) {
  return getAdminDb().collection(FIRMA_INTEGRATIONS_COLLECTION).doc(businessId)
}

// Returns the business if it exists and belongs to ownerId; null if it does not exist
async function loadBusiness(businessId: string, ownerId: string): Promise<TradingDetails | null> {
  const snap = await getAdminDb().collection("settings_trading_details").doc(businessId).get()
  if (!snap.exists) return null
  const data = snap.data() as TradingDetails
  if (data.ownerId !== ownerId) throw new HttpError(404, "not_found")
  return data
}

async function readIntegration(businessId: string): Promise<FirmaBusinessIntegration | null> {
  const snap = await integrationRef(businessId).get()
  return snap.exists ? normalizeFirmaIntegration(snap.data()) : null
}

export async function ensureFirmaWorkspaceForBusiness(
  businessId: string,
  ownerId: string
): Promise<FirmaBusinessIntegration | null> {
  const business = await loadBusiness(businessId, ownerId)
  if (!business) throw new HttpError(404, "not_found")

  const ref = integrationRef(businessId)
  const existing = await readIntegration(businessId)
  if (existing?.workspaceId) {
    if (!existing.workspaceApiKey && process.env.FIRMA_API_KEY) {
      const companyClient = new FirmaClient({ apiKey: process.env.FIRMA_API_KEY })
      const workspace = await companyClient.getWorkspace(existing.workspaceId).catch(() => null)
      const workspaceApiKey = workspace ? getWorkspaceApiKey(workspace) : undefined
      if (workspaceApiKey) {
        await ref.update({
          workspaceApiKey,
          provisioningStatus: "workspace_created",
          updatedAt: AdminFieldValue.serverTimestamp(),
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
  const created = await companyClient.createWorkspace(`${business.name || "IndieSuite"} (${businessId})`)
  const workspace = await companyClient.getWorkspace(created.id).catch(() => created)
  const workspaceApiKey = getWorkspaceApiKey(workspace)

  const integration: FirmaBusinessIntegration = {
    workspaceId: created.id,
    provisioningStatus: workspaceApiKey ? "workspace_created" : "workspace_created_missing_key",
  }
  if (workspaceApiKey) integration.workspaceApiKey = workspaceApiKey

  await ref.set({
    ...toFirestoreObject(integration),
    businessId,
    createdAt: AdminFieldValue.serverTimestamp(),
    updatedAt: AdminFieldValue.serverTimestamp(),
  })

  return integration
}

export async function getFirmaIntegrationForBusiness(
  businessId: string,
  ownerId: string
): Promise<FirmaBusinessIntegration | null> {
  const business = await loadBusiness(businessId, ownerId)
  if (!business) return null
  return readIntegration(businessId)
}

export async function saveFirmaContractTemplateForBusiness(
  businessId: string,
  ownerId: string,
  templateId: string
): Promise<void> {
  const business = await loadBusiness(businessId, ownerId)
  if (!business) throw new HttpError(404, "not_found")

  await integrationRef(businessId).set({
    businessId,
    contractTemplateId: templateId,
    updatedAt: AdminFieldValue.serverTimestamp(),
  }, { merge: true })
}

function normalizeFirmaIntegration(value: Record<string, unknown> | undefined): FirmaBusinessIntegration | null {
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
