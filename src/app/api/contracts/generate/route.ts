import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin"
import { getFirmaClient } from "@/lib/firma/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      eventId?: string
      terms?: Array<{ text: string }>
      data?: { event?: unknown; customer?: unknown; venue?: unknown; invoice?: unknown }
    }
    const { eventId, terms } = body
    if (!eventId && !body?.data?.event) return new Response(JSON.stringify({ error: "missing_eventId_or_data" }), { status: 400 })

    let event: Record<string, unknown>
    let customer: Record<string, unknown> | null = null
    let venue: Record<string, unknown> | null = null
    let invoice: Record<string, unknown> | null = null
    // ownerId retained for potential auditing; not required in no-admin flow
    let ownerId: string | null = null

    const hasAdmin = Boolean(
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    )
    if (hasAdmin && eventId) {
      const db = getAdminDb()
      const evtSnap = await db.collection("events").doc(eventId).get()
      if (!evtSnap.exists) return new Response(JSON.stringify({ error: "event_not_found" }), { status: 404 })
      event = evtSnap.data() as Record<string, unknown>
      ownerId = (evtSnap.data() as { ownerId?: string }).ownerId || null

      if ((event as { customerId?: string }).customerId) {
        const c = await db.collection("customers").doc(String((event as { customerId?: string }).customerId)).get()
        if (c.exists) customer = c.data() as Record<string, unknown>
      }
      if ((event as { venueId?: string }).venueId) {
        const v = await db.collection("venues").doc(String((event as { venueId?: string }).venueId)).get()
        if (v.exists) venue = v.data() as Record<string, unknown>
      }
      const invSnap = await db
        .collection("invoices")
        .where("eventId", "==", eventId)
        .limit(1)
        .get()
      if (!invSnap.empty) invoice = invSnap.docs[0].data() as Record<string, unknown>
    } else {
      // No Admin: require data payload from client
      event = (body.data?.event || {}) as Record<string, unknown>
      customer = (body.data?.customer || null) as Record<string, unknown> | null
      venue = (body.data?.venue || null) as Record<string, unknown> | null
      invoice = (body.data?.invoice || null) as Record<string, unknown> | null
    }

    // Build payload for Firma. Shape may differ per Firma docs; providing a generic document
    let created
    const customerName = ((customer as { fullName?: string; company?: string; name?: string })?.fullName
      || (customer as { name?: string })?.name
      || (customer as { company?: string })?.company
      || "Customer").toString().trim()
    const [firstNameRaw, ...restName] = customerName.split(/\s+/)
    const firstName = firstNameRaw || "Customer"
    const lastName = restName.join(" ") || ""

    const recipients = [
      customer?.email ? { first_name: firstName, last_name: lastName, email: (customer as { email?: string }).email } : undefined,
    ].filter(Boolean)

    const firmaPayload = {
      name: `Contract - ${((event as { title?: string }).title || eventId || "Untitled").toString()}`,
      recipients,
      variables: {
        event,
        customer,
        venue,
        invoice,
        terms: (terms || []).map((t) => ({ text: String(t?.text || "") })),
      },
      // Some Firma endpoints expect `data` instead of `variables`; include both for compatibility.
      data: {
        event,
        customer,
        venue,
        invoice,
        terms: (terms || []).map((t) => ({ text: String(t?.text || "") })),
      },
    }
    try {
      const firma = getFirmaClient()
      let templateId = process.env.FIRMA_TEMPLATE_ID || ""
      if (!templateId) {
        // Fallback: pick a template automatically (prefer name contains "contract")
        const list = (await firma.listTemplates()) as { results?: Array<{ id?: string; name?: string }> }
        const results = Array.isArray(list?.results) ? list.results : []
        const preferred = results.find((t) => String(t?.name || "").toLowerCase().includes("contract"))
        const picked = preferred || results[0]
        if (!picked?.id) throw new Error("No Firma templates found. Set FIRMA_TEMPLATE_ID or create a template.")
        templateId = picked.id
      }
      created = await firma.createSigningRequestFromTemplate(templateId, firmaPayload)
    } catch (err) {
      console.error("Firma createDocument error", { message: (err as Error).message })
      return new Response(
        JSON.stringify({ error: "firma_error", message: (err as Error).message }),
        { status: 502 }
      )
    }

    // In no-Admin mode, do not write to Firestore. Return details to client to save.
    const response = { firma: created, eventTitle: (event as { title?: string }).title || eventId || "", recipients }
    return new Response(JSON.stringify(response), { status: 200 })
  } catch (e) {
    console.error("/api/contracts/generate error", e)
    const msg = (e as Error).message || String(e)
    return new Response(JSON.stringify({ error: "internal_error", message: msg }), { status: 500 })
  }
}


