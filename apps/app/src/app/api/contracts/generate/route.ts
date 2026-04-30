import { NextRequest } from "next/server"
import { buildContractData, buildFieldOverrides, pickTemplateSigner, textValue } from "@/lib/contracts/firma-payload"
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin"
import { getFirmaClient, type FirmaRecipient, type FirmaTemplate } from "@/lib/firma/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type GenerateBody = {
  eventId?: string
  terms?: Array<{ text: string }>
  notes?: string
  data?: {
    event?: unknown
    customer?: unknown
    venue?: unknown
    invoice?: unknown
    invoiceId?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    return await generateContract(req)
  } catch (err) {
    const message = (err as Error)?.message || "Unexpected contract generation error"
    console.error("Contract generation route failed", err)
    return new Response(JSON.stringify({ error: "contract_generation_failed", message }), { status: 500 })
  }
}

async function generateContract(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as GenerateBody | null

  if (!body) return new Response(JSON.stringify({ error: "bad_request" }), { status: 400 })

  const { eventId, terms, notes } = body
  if (!eventId && !body?.data?.event) return new Response(JSON.stringify({ error: "missing_eventId_or_data" }), { status: 400 })

  let event: Record<string, unknown>
  let customer: Record<string, unknown> | null = null
  let venue: Record<string, unknown> | null = null
  let invoice: Record<string, unknown> | null = null
  let invoiceId: string | null = null
  let uid: string | null = null

  const hasAdmin = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    (process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY)
  )
  if (hasAdmin) {
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    const decoded = token ? await getAdminAuth().verifyIdToken(token).catch(() => null) : null
    uid = decoded?.uid || null
    if (!uid) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })
  }

  if (hasAdmin && eventId) {
    const db = getAdminDb()
    const evtSnap = await db.collection("events").doc(eventId).get()
    if (!evtSnap.exists) return new Response(JSON.stringify({ error: "event_not_found" }), { status: 404 })
    event = evtSnap.data() as Record<string, unknown>
    const ownerId = (evtSnap.data() as { ownerId?: string }).ownerId || null
    if (uid && ownerId && uid !== ownerId) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })

    if ((event as { customerId?: string }).customerId) {
      const c = await db.collection("customers").doc(String((event as { customerId?: string }).customerId)).get()
      if (c.exists) customer = c.data() as Record<string, unknown>
    }
    if ((event as { venueId?: string }).venueId) {
      const v = await db.collection("venues").doc(String((event as { venueId?: string }).venueId)).get()
      if (v.exists) venue = v.data() as Record<string, unknown>
    }
    const invSnap = await db.collection("invoices").where("ownerId", "==", uid).where("eventId", "==", eventId).limit(1).get()
    if (!invSnap.empty) {
      invoice = invSnap.docs[0].data() as Record<string, unknown>
      invoiceId = invSnap.docs[0].id
    }
  } else {
    event = (body.data?.event || {}) as Record<string, unknown>
    customer = (body.data?.customer || null) as Record<string, unknown> | null
    venue = (body.data?.venue || null) as Record<string, unknown> | null
    invoice = (body.data?.invoice || null) as Record<string, unknown> | null
    invoiceId = body.data?.invoiceId || null
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
    return new Response(JSON.stringify({ error: "firma_not_configured", message: (err as Error).message }), { status: 500 })
  }
  let templateId =
    process.env.FIRMA_TEMPLATE_ID ||
    ""
  if (!templateId) {
    const list = (await firma.listTemplates().catch((err: unknown) => ({ error: String((err as Error)?.message || err) }))) as { results?: Array<{ id?: string; name?: string }>; error?: string }
    if (list.error) return new Response(JSON.stringify({ error: "firma_templates_error", message: list.error }), { status: 502 })
    const results = Array.isArray(list?.results) ? list.results : []
    const preferred = results.find((t) => String(t?.name || "").toLowerCase().includes("contract"))
    const picked = preferred || results[0]
    if (!picked?.id) {
      return new Response(JSON.stringify({
        error: "no_templates",
        message: "No Firma templates were found. Set FIRMA_TEMPLATE_ID to the contract template ID or create a template in Firma.",
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
    return new Response(JSON.stringify({ error: "firma_error", message: (created as { error: string }).error }), { status: 502 })
  }

  const response = {
    firma: created,
    eventTitle: (event as { title?: string }).title || eventId || "",
    recipients,
    contractData,
    relatedIds: {
      eventId: eventId || null,
      customerId: textValue(event, "customerId"),
      venueId: textValue(event, "venueId"),
      invoiceId,
      businessId: textValue(event, "businessId"),
    },
  }
  return new Response(JSON.stringify(response), { status: 200 })
}

