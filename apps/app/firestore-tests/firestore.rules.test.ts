import { readFileSync } from "node:fs"
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest"
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore"
import { stripUndefined } from "../src/lib/strip-undefined"

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-indie-suite",
    firestore: { rules: readFileSync(new URL("../../../firestore.rules", import.meta.url), "utf8") },
  })
})

afterAll(async () => {
  await env?.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    const createdAt = Timestamp.fromDate(new Date("2026-01-01"))
    await setDoc(doc(db, "billing/alice"), { status: "trialing", plan: "pro" })
    await setDoc(doc(db, "billing/bob"), { status: "active", plan: "pro" })
    await setDoc(doc(db, "billing/carol"), { status: "canceled", plan: "pro" })
    await setDoc(doc(db, "settings_trading_details/biz-alice"), { ownerId: "alice", name: "Alice Music", createdAt })
    await setDoc(doc(db, "settings_trading_details/biz-bob"), { ownerId: "bob", name: "Bob Music", createdAt })
    await setDoc(doc(db, "customers/c-alice"), { ownerId: "alice", businessId: "biz-alice", fullName: "Ada", email: "ada@example.com", createdAt, eventsLinked: 0, totalValue: 0 })
    await setDoc(doc(db, "customers/c-carol"), { ownerId: "carol", businessId: "biz-carol", fullName: "Cy", createdAt })
    await setDoc(doc(db, "venues/v-alice"), { ownerId: "alice", businessId: "biz-alice", name: "Town Hall", createdAt, eventsLinked: 0, totalValue: 0 })
    await setDoc(doc(db, "settings_bank_accounts/ba-alice"), { ownerId: "alice", businessId: "biz-alice", name: "Main", createdAt })
    await setDoc(doc(db, "contracts/k-alice"), { ownerId: "alice", firmaId: "sr_1", status: "draft" })
    await setDoc(doc(db, "customers/c-bob"), { ownerId: "bob", businessId: "biz-bob", fullName: "Bea", createdAt })
    await setDoc(doc(db, "venues/v-bob"), { ownerId: "bob", businessId: "biz-bob", name: "Bob Hall", createdAt })
    await setDoc(doc(db, "settings_bank_accounts/ba-bob"), { ownerId: "bob", businessId: "biz-bob", name: "Bob GBP", createdAt })
    await setDoc(doc(db, "events/e-alice"), { ownerId: "alice", businessId: "biz-alice", title: "Gig", startsAt: "2026-05-01T18:00:00.000Z", endsAt: null, notes: null, customerId: "c-alice", venueId: "v-alice", createdAt })
    await setDoc(doc(db, "events/e-bob"), { ownerId: "bob", businessId: "biz-bob", title: "Bob Gig", startsAt: "2026-05-01T18:00:00.000Z", customerId: "c-bob", venueId: "v-bob", createdAt })
    await setDoc(doc(db, "invoices/i-alice"), { ownerId: "alice", businessId: "biz-alice", invoice_number: "INV-1", status: "draft", eventId: "e-alice", bank_account_id: "ba-alice", include_bank_account: true, createdAt, updatedAt: createdAt })
    await setDoc(doc(db, "integrations_firma/biz-alice"), { businessId: "biz-alice", workspaceApiKey: "secret" })
    await setDoc(doc(db, "stripe_events/evt_1"), { type: "customer.subscription.updated" })
  })
})

function as(uid: string, emailVerified = true) {
  return env.authenticatedContext(uid, { email_verified: emailVerified }).firestore()
}

// Payloads mirror what lib/firebase/* send (optional fields as null, createdAt as serverTimestamp), passed
// through the same stripUndefined helper so a sentinel-mangling regression fails here
function customerPayload(overrides: Record<string, unknown> = {}) {
  return stripUndefined({
    fullName: "Grace Hopper", fullNameLower: "grace hopper", company: null, email: "grace@example.com",
    phone: null, website: null, address: { city: "Leeds", postcode: "LS1" }, preferredContact: "email", notes: null,
    createdAt: serverTimestamp(), eventsLinked: 0, totalValue: 0, ownerId: "alice", businessId: "biz-alice",
    ...overrides,
  })
}

function venuePayload(overrides: Record<string, unknown> = {}) {
  return stripUndefined({
    name: "Corn Exchange", nameLower: "corn exchange", phone: null, website: null, address: null, notes: null,
    createdAt: serverTimestamp(), eventsLinked: 0, totalValue: 0, ownerId: "alice", businessId: "biz-alice",
    ...overrides,
  })
}

function bankPayload(overrides: Record<string, unknown> = {}) {
  return stripUndefined({
    name: "Savings", bankName: "Monzo", accountHolder: "Alice", accountNumberOrIban: "GB00TEST", sortCodeOrBic: "00-00-00",
    currency: "GBP", notes: null, createdAt: serverTimestamp(), ownerId: "alice", businessId: "biz-alice",
    ...overrides,
  })
}

describe("tenant isolation", () => {
  it("lets an owner with a live plan read their own documents", async () => {
    await assertSucceeds(getDoc(doc(as("alice"), "customers/c-alice")))
    await assertSucceeds(getDocs(query(collection(as("alice"), "customers"), where("ownerId", "==", "alice"))))
  })

  it("denies reading another tenant's documents", async () => {
    await assertFails(getDoc(doc(as("bob"), "customers/c-alice")))
    await assertFails(getDocs(query(collection(as("bob"), "customers"), where("ownerId", "==", "alice"))))
  })

  it("denies unfiltered collection queries", async () => {
    await assertFails(getDocs(collection(as("alice"), "customers")))
  })

  it("denies unauthenticated access", async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "customers/c-alice")))
  })

  it("denies users whose email is not verified (R-01d)", async () => {
    await assertFails(getDoc(doc(as("alice", false), "customers/c-alice")))
    await assertFails(setDoc(doc(as("alice", false), "customers/new"), customerPayload()))
  })
})

describe("plan gate", () => {
  it("denies an owner whose subscription is cancelled", async () => {
    await assertFails(getDoc(doc(as("carol"), "customers/c-carol")))
  })

  it("denies a user with no billing record", async () => {
    await assertFails(setDoc(doc(as("dave"), "customers/new"), customerPayload({ ownerId: "dave" })))
  })
})

describe("server-only collections", () => {
  it.each([
    ["integrations_firma/biz-alice"],
    ["billing/alice"],
    ["stripe_events/evt_1"],
  ])("denies client reads and writes on %s", async (path) => {
    await assertFails(getDoc(doc(as("alice"), path)))
    await assertFails(setDoc(doc(as("alice"), path), { ownerId: "alice" }))
  })
})

describe("server-created collections", () => {
  it("denies client creation of businesses and contracts", async () => {
    await assertFails(setDoc(doc(as("alice"), "settings_trading_details/new"), { ownerId: "alice", name: "Second", createdAt: serverTimestamp() }))
    await assertFails(setDoc(doc(as("alice"), "contracts/new"), { ownerId: "alice", businessId: "biz-alice", title: "x" }))
  })

  it("denies client updates to contracts but allows the owner to delete", async () => {
    await assertFails(updateDoc(doc(as("alice"), "contracts/k-alice"), { firmaId: "sr_other" }))
    await assertSucceeds(deleteDoc(doc(as("alice"), "contracts/k-alice")))
  })
})

describe.each([
  ["customers", customerPayload, "c-alice", { fullName: "Ada Lovelace", fullNameLower: "ada lovelace", notes: "VIP" }],
  ["venues", venuePayload, "v-alice", { name: "Town Hall East", nameLower: "town hall east", phone: "0113" }],
  ["settings_bank_accounts", bankPayload, "ba-alice", { name: "Main GBP", currency: "GBP" }],
] as const)("%s", (col, payload, existingId, allowedUpdate) => {
  it("allows creating the app's payload in one of the caller's businesses", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), `${col}/new`), payload()))
  })

  it("denies a businessId the caller does not own (R-01b)", async () => {
    await assertFails(setDoc(doc(as("alice"), `${col}/new`), payload({ businessId: "biz-bob" })))
    await assertFails(setDoc(doc(as("alice"), `${col}/new`), payload({ businessId: "biz-missing" })))
  })

  it("denies another owner, extra fields or a client-chosen createdAt", async () => {
    await assertFails(setDoc(doc(as("alice"), `${col}/new`), payload({ ownerId: "bob" })))
    await assertFails(setDoc(doc(as("alice"), `${col}/new`), payload({ isAdmin: true })))
    await assertFails(setDoc(doc(as("alice"), `${col}/new`), payload({ createdAt: Timestamp.fromDate(new Date("2020-01-01")) })))
  })

  it("allows the owner to update editable fields", async () => {
    await assertSucceeds(updateDoc(doc(as("alice"), `${col}/${existingId}`), allowedUpdate))
  })

  it.each([
    ["ownerId", { ownerId: "bob" }],
    ["businessId", { businessId: "biz-bob" }],
    ["createdAt", { createdAt: Timestamp.fromDate(new Date("2020-01-01")) }],
    ["an unknown field", { isAdmin: true }],
  ])("denies changing %s (R-01a)", async (_label, update) => {
    await assertFails(updateDoc(doc(as("alice"), `${col}/${existingId}`), update))
  })

  it("denies another tenant updating or deleting it", async () => {
    await assertFails(updateDoc(doc(as("bob"), `${col}/${existingId}`), allowedUpdate))
    await assertFails(deleteDoc(doc(as("bob"), `${col}/${existingId}`)))
  })
})

describe("field validation", () => {
  it("rejects oversized and wrongly typed values", async () => {
    await assertFails(setDoc(doc(as("alice"), "customers/new"), customerPayload({ notes: "x".repeat(5001) })))
    await assertFails(setDoc(doc(as("alice"), "customers/new"), customerPayload({ fullName: 42 })))
    await assertFails(setDoc(doc(as("alice"), "customers/new"), customerPayload({ fullName: "" })))
    await assertFails(setDoc(doc(as("alice"), "customers/new"), customerPayload({ preferredContact: "pigeon" })))
    await assertFails(setDoc(doc(as("alice"), "customers/new"), customerPayload({ address: { city: "Leeds", injected: "x" } })))
  })

  it("rejects non-zero counters on create", async () => {
    await assertFails(setDoc(doc(as("alice"), "customers/new"), customerPayload({ totalValue: 1000 })))
    await assertFails(setDoc(doc(as("alice"), "venues/new"), venuePayload({ eventsLinked: 5 })))
  })

  it("does not let clients edit customer counters", async () => {
    await assertFails(updateDoc(doc(as("alice"), "customers/c-alice"), { totalValue: 99999 }))
  })
})

describe("settings_trading_details", () => {
  const update = {
    name: "Alice Music Ltd", contactName: null, contactEmail: "a@example.com", emails: null, phone: null,
    building: null, street: null, city: "Leeds", area: null, postcode: null, country: "UK",
  }

  it("allows the owner to update trading details", async () => {
    await assertSucceeds(updateDoc(doc(as("alice"), "settings_trading_details/biz-alice"), update))
  })

  it("denies changing ownerId or adding Firma fields", async () => {
    await assertFails(updateDoc(doc(as("alice"), "settings_trading_details/biz-alice"), { ownerId: "bob" }))
    await assertFails(updateDoc(doc(as("alice"), "settings_trading_details/biz-alice"), { firma: { workspaceId: "ws_victim" } }))
  })

  it("denies other tenants", async () => {
    await assertFails(getDoc(doc(as("bob"), "settings_trading_details/biz-alice")))
    await assertFails(updateDoc(doc(as("bob"), "settings_trading_details/biz-alice"), { name: "pwned" }))
  })
})

function eventPayload(overrides: Record<string, unknown> = {}) {
  return stripUndefined({
    title: "Launch Party", startsAt: "2026-06-01T19:00:00.000Z", endsAt: null, notes: null,
    customerId: "c-alice", venueId: "v-alice", createdAt: serverTimestamp(), ownerId: "alice", businessId: "biz-alice",
    ...overrides,
  })
}

// Mirrors InvoiceForm + createInvoice (businessId spread from the form, then set again by createInvoice)
function invoicePayload(overrides: Record<string, unknown> = {}) {
  return stripUndefined({
    invoice_number: "INV-2", issue_date: "2026-06-01", due_date: "2026-06-15",
    user_business_name: "Alice Music", user_email: "alice@example.com", user_contact_name: "Alice",
    customer_name: "Grace", customer_email: "grace@example.com",
    line_items: [{ description: "Set", quantity: 1, unit_price: 500 }],
    payments: [{ name: "Final payment", due_date: "2026-06-15", amount: 500, reference: "", invoice_number: "INV-2", currency: "GBP" }],
    venue_name: "", venue_city: "", venue_postcode: "", venue_phone: "",
    eventId: "e-alice", status: "draft", include_payment_link: false, include_bank_account: true, include_notes: false,
    bank_account_id: "ba-alice",
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ownerId: "alice", businessId: "biz-alice",
    ...overrides,
  })
}

describe("events", () => {
  it("allows creating the app's payload with the caller's own customer and venue", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "events/new"), eventPayload()))
  })

  it.each([
    ["another tenant's customer", { customerId: "c-bob" }],
    ["another tenant's venue", { venueId: "v-bob" }],
    ["a missing customer", { customerId: "c-missing" }],
    ["a business the caller does not own", { businessId: "biz-bob" }],
    ["an extra field", { status: "confirmed" }],
  ])("denies creating with %s (S-01)", async (_label, overrides) => {
    await assertFails(setDoc(doc(as("alice"), "events/new"), eventPayload(overrides)))
  })

  it("allows the edit form's update, which resends the unchanged customer and venue", async () => {
    await assertSucceeds(updateDoc(doc(as("alice"), "events/e-alice"), {
      title: "Gig (late)", startsAt: "2026-05-01T20:00:00.000Z", endsAt: null, notes: "Load in 6pm", customerId: "c-alice", venueId: "v-alice",
    }))
  })

  it.each([
    ["customerId to another tenant", { customerId: "c-bob" }],
    ["venueId to another tenant", { venueId: "v-bob" }],
    ["ownerId", { ownerId: "bob" }],
    ["businessId", { businessId: "biz-bob" }],
  ])("denies changing %s", async (_label, update) => {
    await assertFails(updateDoc(doc(as("alice"), "events/e-alice"), update))
  })
})

describe("invoices", () => {
  it("allows creating the invoice form's payload", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "invoices/new"), invoicePayload()))
  })

  it("allows an invoice without an event or bank account", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "invoices/new"), invoicePayload({ eventId: null, bank_account_id: null, include_bank_account: false })))
  })

  it.each([
    ["another tenant's bank account", { bank_account_id: "ba-bob" }],
    ["another tenant's event", { eventId: "e-bob" }],
    ["a business the caller does not own", { businessId: "biz-bob" }],
    ["an unknown status", { status: "refunded" }],
    ["an extra field", { bank_account: { accountNumberOrIban: "GB00VICTIM" } }],
    ["a client-chosen updatedAt", { updatedAt: Timestamp.fromDate(new Date("2020-01-01")) }],
  ])("denies creating with %s (S-01, R-14)", async (_label, overrides) => {
    await assertFails(setDoc(doc(as("alice"), "invoices/new"), invoicePayload(overrides)))
  })

  it("allows the status menu update", async () => {
    await assertSucceeds(updateDoc(doc(as("alice"), "invoices/i-alice"), { status: "paid", updatedAt: serverTimestamp() }))
  })

  it("allows the edit form's full update", async () => {
    // updateInvoice sends the form payload without the identity fields
    const editable: Record<string, unknown> = invoicePayload({ invoice_number: "INV-1", notes: "Thanks" })
    for (const key of ["createdAt", "ownerId", "businessId"]) delete editable[key]
    await assertSucceeds(updateDoc(doc(as("alice"), "invoices/i-alice"), editable))
  })

  it.each([
    ["bank_account_id to another tenant", { bank_account_id: "ba-bob" }],
    ["eventId to another tenant", { eventId: "e-bob" }],
    ["ownerId", { ownerId: "bob" }],
    ["businessId", { businessId: "biz-bob" }],
    ["createdAt", { createdAt: Timestamp.fromDate(new Date("2020-01-01")) }],
  ])("denies changing %s", async (_label, update) => {
    await assertFails(updateDoc(doc(as("alice"), "invoices/i-alice"), { ...update, updatedAt: serverTimestamp() }))
  })

  it("requires updatedAt to be the server time", async () => {
    await assertFails(updateDoc(doc(as("alice"), "invoices/i-alice"), { status: "paid" }))
  })
})

describe("unlisted collections", () => {
  it("are denied by default", async () => {
    await assertFails(setDoc(doc(as("alice"), "receipts/new"), { ownerId: "alice", businessId: "biz-alice" }))
    await assertFails(getDocs(query(collection(as("alice"), "anything"), where("ownerId", "==", "alice"))))
  })
})
