import { NextRequest } from "next/server"
import { AdminFieldValue, getAdminAuth, getAdminDb } from "@/lib/firebase/admin"
import { getFirmaClient, type FirmaRecipient } from "@/lib/firma/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { id?: string } | null
  const id = body?.id?.trim()
  if (!id) return new Response(JSON.stringify({ error: "missing_id" }), { status: 400 })

  const hasAdmin = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    (process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY)
  )
  if (!hasAdmin) return new Response(JSON.stringify({ error: "admin_not_configured" }), { status: 500 })

  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  const decoded = token ? await getAdminAuth().verifyIdToken(token).catch(() => null) : null
  if (!decoded?.uid) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })

  const db = getAdminDb()
  const ref = db.collection("contracts").doc(id)
  const snap = await ref.get().catch(() => null)
  if (!snap) return new Response(JSON.stringify({ error: "query_failed" }), { status: 500 })
  if (!snap.exists) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 })

  const data = (snap.data() as { firmaId?: string; ownerId?: string; recipients?: FirmaRecipient[] })
  if (data.ownerId && data.ownerId !== decoded.uid) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })
  if (!data.firmaId) return new Response(JSON.stringify({ error: "missing_firmaId" }), { status: 400 })

  const firma = getFirmaClient()
  const srId = data.firmaId
  const sr = await firma.getSigningRequest(srId).catch(() => ({}))
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
        return new Response(JSON.stringify({ error: 'firma_send_failed', message: (retryError as Error)?.message || 'send_failed', signingRequest: sr }), { status: 502 })
      })
    }
    return new Response(JSON.stringify({ error: 'firma_send_failed', message: (e as Error)?.message || 'send_failed', signingRequest: sr }), { status: 502 })
  })
  if (sentOk instanceof Response) return sentOk
  await ref.update({ status: "sent", sentAt: AdminFieldValue.serverTimestamp() }).catch(() => null)
  return new Response(JSON.stringify({ ok: true }), { status: 200 })
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


