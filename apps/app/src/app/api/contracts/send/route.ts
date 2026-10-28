import { NextRequest } from "next/server"
import { AdminFieldValue, getAdminDb } from "@/lib/firebase/admin"
import { getFirmaIntegrationForBusiness } from "@/lib/firma/provisioning"
import { FirmaClient, getFirmaClient, type FirmaRecipient } from "@/lib/firma/server"
import { handleRouteError, jsonError, loadOwned, requireUser } from "@/lib/server/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireUser(req)

    const body = (await req.json().catch(() => null)) as { id?: string } | null
    const id = body?.id?.trim()
    if (!id) return new Response(JSON.stringify({ error: "missing_id" }), { status: 400 })

    const data = await loadOwned<{ firmaId?: string; ownerId?: string; businessId?: string; recipients?: FirmaRecipient[] }>("contracts", id, uid)
    if (!data.firmaId) return new Response(JSON.stringify({ error: "missing_firmaId" }), { status: 400 })

    let firma = getFirmaClient()
    if (data.businessId) {
      const integration = await getFirmaIntegrationForBusiness(data.businessId, uid).catch(() => null)
      if (integration?.workspaceApiKey && integration.contractTemplateId) {
        firma = new FirmaClient({ apiKey: integration.workspaceApiKey })
      }
    }
    const srId = data.firmaId
    const sentOk = await firma.sendSigningRequest(srId).then(() => true).catch(async (e: unknown) => {
      const validationErrors = parseFirmaValidationErrors((e as Error)?.message || "")
      const contractRecipient = data.recipients?.[0]
      if (contractRecipient && validationErrors.length > 0) {
        // Some Firma templates keep a blank placeholder signer after create.
        // Patch it from our saved contract recipient, then retry the send.
        await Promise.all(validationErrors.map((validationError) => (
          firma.updateSigningRequestRecipient(srId, {
            ...contractRecipient,
            id: validationError.signer_id,
            first_name: contractRecipient.first_name || "Signer",
            last_name: contractRecipient.last_name || "-",
            designation: "Signer",
            order: contractRecipient.order || 1,
          })
        )))
        return await firma.sendSigningRequest(srId).then(() => true).catch((retryError: unknown) => {
          console.error("/api/contracts/send firma retry error:", (retryError as Error)?.message || retryError)
          return jsonError("firma_send_failed", 502)
        })
      }
      console.error("/api/contracts/send firma error:", (e as Error)?.message || e)
      return jsonError("firma_send_failed", 502)
    })
    if (sentOk instanceof Response) return sentOk
    await getAdminDb().collection("contracts").doc(id).update({ status: "sent", sentAt: AdminFieldValue.serverTimestamp() }).catch(() => null)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    return handleRouteError(err, "/api/contracts/send")
  }
}

function parseFirmaValidationErrors(message: string): Array<{ signer_id: string }> {
  try {
    const jsonStart = message.indexOf("{")
    if (jsonStart === -1) return []
    const parsed = JSON.parse(message.slice(jsonStart)) as {
      validation_errors?: Array<{ signer_id?: string; missing_fields?: string[] }>
    }
    return (parsed.validation_errors || [])
      .filter((error): error is { signer_id: string; missing_fields?: string[] } => Boolean(error.signer_id))
      .filter((error) => error.missing_fields?.includes("first_name") || error.missing_fields?.includes("email"))
  } catch {
    return []
  }
}


