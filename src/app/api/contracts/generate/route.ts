import { NextRequest } from "next/server"
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin"
import { getFirmaClient } from "@/lib/firma/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { eventId?: string; terms?: Array<{ text: string }>; data?: { event?: unknown; customer?: unknown; venue?: unknown; invoice?: unknown } }
    | null

  if (!body) return new Response(JSON.stringify({ error: "bad_request" }), { status: 400 })

  const { eventId, terms } = body
  if (!eventId && !body?.data?.event) return new Response(JSON.stringify({ error: "missing_eventId_or_data" }), { status: 400 })

  let event: Record<string, unknown>
  let customer: Record<string, unknown> | null = null
  let venue: Record<string, unknown> | null = null
  let invoice: Record<string, unknown> | null = null
  let uid: string | null = null

  const hasAdmin = Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  )
  if (hasAdmin) {
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    const decoded = token ? await getAdminAuth().verifyIdToken(token).catch(() => null) : null
    uid = decoded?.uid || null
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
    const invSnap = await db.collection("invoices").where("eventId", "==", eventId).limit(1).get()
    if (!invSnap.empty) invoice = invSnap.docs[0].data() as Record<string, unknown>
  } else {
    event = (body.data?.event || {}) as Record<string, unknown>
    customer = (body.data?.customer || null) as Record<string, unknown> | null
    venue = (body.data?.venue || null) as Record<string, unknown> | null
    invoice = (body.data?.invoice || null) as Record<string, unknown> | null
  }

  const customerName = ((customer as { fullName?: string; company?: string; name?: string })?.fullName
    || (customer as { name?: string })?.name
    || (customer as { company?: string })?.company
    || "Customer").toString().trim()
  const [firstNameRaw, ...restName] = customerName.split(/\s+/)
  const firstName = firstNameRaw || "Customer"
  const lastName = restName.join(" ") || ""
  const recipients = [customer?.email ? { first_name: firstName, last_name: lastName, email: (customer as { email?: string }).email } : undefined].filter(Boolean)

  const firma = getFirmaClient()
  let templateId = process.env.FIRMA_TEMPLATE_ID || ""
  if (!templateId) {
    const list = (await firma.listTemplates().catch(() => ({}))) as { results?: Array<{ id?: string; name?: string }> }
    const results = Array.isArray(list?.results) ? list.results : []
    const preferred = results.find((t) => String(t?.name || "").toLowerCase().includes("contract"))
    const picked = preferred || results[0]
    if (!picked?.id) return new Response(JSON.stringify({ error: "no_templates" }), { status: 500 })
    templateId = picked.id
  }

  const firmaPayload = {
    name: `Contract - ${((event as { title?: string }).title || eventId || "Untitled").toString()}`,
    recipients,
    variables: { event, customer, venue, invoice, terms: (terms || []).map((t) => ({ text: String(t?.text || "") })) },
    data: { event, customer, venue, invoice, terms: (terms || []).map((t) => ({ text: String(t?.text || "") })) },
  }
  const created = await firma.createSigningRequestFromTemplate(templateId, firmaPayload).catch((err: unknown) => {
    return { error: String((err as Error)?.message || err) }
  })
  if ((created as { error?: string }).error) {
    return new Response(JSON.stringify({ error: "firma_error", message: (created as { error: string }).error }), { status: 502 })
  }

  const response = { firma: created, eventTitle: (event as { title?: string }).title || eventId || "", recipients }
  return new Response(JSON.stringify(response), { status: 200 })
}


