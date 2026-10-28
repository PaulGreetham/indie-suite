#!/usr/bin/env node
// One-off migration (WS-4b): move settings_trading_details.firma into server-only integrations_firma/{businessId}.
//
// Usage (from the repo root; uses the same Admin credentials as the app):
//   node --env-file=apps/app/.env.local apps/app/scripts/migrate-firma-integrations.mjs                    # dry run
//   node --env-file=apps/app/.env.local apps/app/scripts/migrate-firma-integrations.mjs --apply            # copy
//   node --env-file=apps/app/.env.local apps/app/scripts/migrate-firma-integrations.mjs --apply --delete-legacy
//
// Businesses sharing a workspaceId are reported and skipped: one of them may hold another tenant's key (R-17).
// Existing integrations_firma docs are never overwritten.
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const admin = require("firebase-admin")

const apply = process.argv.includes("--apply")
const deleteLegacy = process.argv.includes("--delete-legacy")
if (deleteLegacy && !apply) {
  console.error("--delete-legacy requires --apply")
  process.exit(1)
}

function initAdmin() {
  let projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  let clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let rawPk = process.env.FIREBASE_PRIVATE_KEY
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (json && (!projectId || !clientEmail || !rawPk)) {
    const parsed = JSON.parse(json)
    projectId = projectId || parsed.project_id
    clientEmail = clientEmail || parsed.client_email
    rawPk = rawPk || parsed.private_key
  }
  if (!projectId || !clientEmail || !rawPk) {
    console.error("Missing Firebase Admin env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY")
    process.exit(1)
  }
  admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey: rawPk.replace(/\\n/g, "\n") }) })
  return projectId
}

const projectId = initAdmin()
const db = admin.firestore()
const { FieldValue } = admin.firestore

console.log(`Project: ${projectId}`)
console.log(`Mode: ${apply ? (deleteLegacy ? "APPLY + DELETE LEGACY" : "APPLY (copy only)") : "DRY RUN"}\n`)

const snap = await db.collection("settings_trading_details").get()
const rows = snap.docs
  .map((d) => ({ id: d.id, ref: d.ref, data: d.data() }))
  .filter((r) => r.data.firma && typeof r.data.firma === "object")

const byWorkspace = new Map()
for (const r of rows) {
  const ws = r.data.firma.workspaceId ? String(r.data.firma.workspaceId) : ""
  if (!ws) continue
  byWorkspace.set(ws, [...(byWorkspace.get(ws) || []), r.id])
}
const shared = new Set([...byWorkspace].filter(([, ids]) => ids.length > 1).flatMap(([, ids]) => ids))

let copied = 0, existed = 0, skipped = 0, legacyDeleted = 0
for (const r of rows) {
  const f = r.data.firma
  const label = `${r.id} owner=${r.data.ownerId || "(none)"} name=${JSON.stringify(r.data.name || "")} workspace=${f.workspaceId || "(none)"} key=${f.workspaceApiKey ? "yes" : "no"} template=${f.contractTemplateId || "(none)"}`

  if (!f.workspaceId) {
    console.log(`SKIP  no workspaceId     ${label}`)
    skipped++
    continue
  }
  if (shared.has(r.id)) {
    console.log(`SKIP  SHARED WORKSPACE   ${label}`)
    skipped++
    continue
  }
  if (!r.data.ownerId) {
    console.log(`SKIP  business has no ownerId  ${label}`)
    skipped++
    continue
  }

  const target = db.collection("integrations_firma").doc(r.id)
  const exists = (await target.get()).exists
  if (exists) {
    console.log(`EXISTS                  ${label}`)
    existed++
  } else {
    console.log(`COPY                    ${label}`)
    if (apply) {
      const doc = { businessId: r.id, workspaceId: String(f.workspaceId), migratedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }
      if (f.workspaceApiKey) doc.workspaceApiKey = String(f.workspaceApiKey)
      if (f.contractTemplateId) doc.contractTemplateId = String(f.contractTemplateId)
      if (f.provisioningStatus) doc.provisioningStatus = String(f.provisioningStatus)
      doc.createdAt = f.createdAt || FieldValue.serverTimestamp()
      await target.set(doc)
    }
    copied++
  }

  if (deleteLegacy) {
    await r.ref.update({ firma: FieldValue.delete() })
    legacyDeleted++
  }
}

console.log(`\nBusinesses with legacy firma field: ${rows.length}`)
console.log(`${apply ? "Copied" : "Would copy"}: ${copied}   Already migrated: ${existed}   Skipped: ${skipped}   Legacy fields deleted: ${legacyDeleted}`)
if (shared.size) {
  console.log("\nSHARED WORKSPACES (resolve manually; not migrated, legacy field left in place):")
  for (const [ws, ids] of byWorkspace) if (ids.length > 1) console.log(`  ${ws}: ${ids.join(", ")}`)
}
