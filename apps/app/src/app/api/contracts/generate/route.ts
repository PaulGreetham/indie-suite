import { NextRequest } from "next/server"
import { buildContractData, buildFieldOverrides, pickTemplateSigner, textValue } from "@/lib/contracts/firma-payload"
import { buildContractCreatePayload } from "@/lib/contracts/firestore-payload"
import { AdminFieldValue, getAdminDb } from "@/lib/firebase/admin"
import { getFirmaIntegrationForBusiness } from "@/lib/firma/provisioning"
import { FirmaClient, getFirmaClient, type FirmaRecipient, type FirmaTemplate } from "@/lib/firma/server"
import { handleRouteError, loadOwned, loadOwnedOrNull, requireActiveUser } from "@/lib/server/auth"
import { rateLimit } from "@/lib/server/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type GenerateBody = {
  eventId?: string
  terms?: Array<{ text: string }>
  notes?: string
}

export async function POST(req: NextRequest) {
  try {
    return await generateContract(req)
  } catch (err) {
    return handleRouteError(err, "/api/contracts/generate")
  }
}

async function generateContract(req: NextRequest) {
  const { uid } = await requireActiveUser(req)
  await rateLimit(uid, "firma")

  const body = (await req.json().catch(() => null)) as GenerateBody | null
  if (!body) return new Response(JSON.stringify({ error: "bad_request" }), { status: 400 })

  // Contract data is always loaded server-side; client-supplied record data is ignored (R-10)
  const { eventId, terms, notes } = body
  if (!eventId) return new Response(JSON.stringify({ error: "missing_eventId" }), { status: 400 })

  const event: Record<string, unknown> = await loadOwned("events", eventId, uid)
  const customer = await loadOwnedOrNull("customers", event.customerId, uid)
  const venue = await loadOwnedOrNull("venues", event.venueId, uid)

  let invoice: Record<string, unknown> | null = null
  let invoiceId: string | null = null
  const invSnap = await getAdminDb().collection("invoices").where("ownerId", "==", uid).where("eventId", "==", eventId).limit(1).get()
  if (!invSnap.empty) {
    invoice = invSnap.docs[0].data() as Record<string, unknown>
    invoiceId = invSnap.docs[0].id
  }

  const customerName = ((customer as { fullName?: string; company?: string; name?: string })?.fullName
    || (customer as { name?: string })?.name
    || (customer as { company?: string })?.company
    || "Customer").toString().trim()
  const [firstNameRaw, ...restName] = customerName.split(/\s+/)
  const firstName = firstNameRaw || "Customer"
  const lastName = restName.join(" ") || ""
  const customerEmail = String((customer as { email?: string } | null)?.email || "").trim()
  if (!customerEmail) return new Response(JSON.stringify({ error: "missing_recipient_email" }), { status: 400 })

  const contractData = buildContractData({
    event,
    customer,
    venue,
    invoice,
    terms: terms || [],
    notes,
    eventId,
    invoiceId,
  })
  const recipientBase: FirmaRecipient = {
    first_name: firstName,
    last_name: lastName || "-",
    email: customerEmail,
    designation: "Signer",
    order: 1,
    company: textValue(customer, "company"),
    custom_fields: contractData,
  }

  let firma
  try {
    firma = getFirmaClient()
  } catch (err) {
    console.error("/api/contracts/generate firma config error:", (err as Error)?.message || err)
    return new Response(JSON.stringify({ error: "firma_not_configured" }), { status: 500 })
  }
  let templateId = process.env.FIRMA_DEFAULT_TEMPLATE_ID || process.env.FIRMA_TEMPLATE_ID || ""
  const businessId = textValue(event, "businessId")
  // Which Firma account the signing request lives in; send uses the same one (R-11)
  let firmaAccount: "workspace" | "company" = "company"
  if (businessId) {
    const integration = await getFirmaIntegrationForBusiness(businessId, uid)
    if (integration?.workspaceApiKey && integration.contractTemplateId) {
      firma = new FirmaClient({ apiKey: integration.workspaceApiKey })
      templateId = integration.contractTemplateId
      firmaAccount = "workspace"
    }
  }
  if (!templateId) {
    const list = (await firma.listTemplates().catch((err: unknown) => ({ error: String((err as Error)?.message || err) }))) as { results?: Array<{ id?: string; name?: string }>; error?: string }
    if (list.error) {
      console.error("/api/contracts/generate firma templates error:", list.error)
      return new Response(JSON.stringify({ error: "firma_templates_error" }), { status: 502 })
    }
    const results = Array.isArray(list?.results) ? list.results : []
    const preferred = results.find((t) => String(t?.name || "").toLowerCase().includes("contract"))
    const picked = preferred || results[0]
    if (!picked?.id) {
      return new Response(JSON.stringify({
        error: "no_templates",
        message: "No Firma templates were found. Set FIRMA_DEFAULT_TEMPLATE_ID or configure a business-specific Firma template.",
      }), { status: 500 })
    }
    templateId = picked.id
  }

  const template = await firma.getTemplate(templateId).catch(() => null) as FirmaTemplate | null
  const templateSigner = pickTemplateSigner(template)
  const recipients: FirmaRecipient[] = [{
    ...recipientBase,
    template_user_id: templateSigner?.id,
    order: templateSigner?.order || recipientBase.order,
  }]

  const firmaPayload = {
    name: `Contract - ${((event as { title?: string }).title || eventId || "Untitled").toString()}`,
    description: textValue({ notes }, "notes"),
    recipients,
    fields: buildFieldOverrides(contractData),
  }
  const created = await firma.createSigningRequestFromTemplate(templateId, firmaPayload).catch((err: unknown) => {
    return { error: String((err as Error)?.message || err) }
  })
  if ((created as { error?: string }).error) {
    console.error("/api/contracts/generate firma error:", (created as { error: string }).error)
    return new Response(JSON.stringify({ error: "firma_error" }), { status: 502 })
  }

  // Persist the contract server-side so Firma ids, recipients and related ids never come from the client (R-11)
  const signingRequest = created as { id?: string; url?: string; document_url?: string; firmaUrl?: string }
  const eventTitle = textValue(event, "title") || eventId
  const payload = buildContractCreatePayload({
    title: `Contract - ${eventTitle}`,
    eventId,
    customerId: textValue(event, "customerId") || null,
    venueId: textValue(event, "venueId") || null,
    invoiceId,
    terms: terms || [],
    notes: notes || "",
    status: "draft",
    recipients,
    firmaId: signingRequest.id || null,
    firmaUrl: signingRequest.firmaUrl || signingRequest.url || signingRequest.document_url || null,
    businessId: businessId || null,
    contractData,
  }, uid, AdminFieldValue.serverTimestamp())
  const ref = await getAdminDb().collection("contracts").add({ ...payload, firmaAccount })

  return new Response(JSON.stringify({ id: ref.id }), { status: 200 })
}
