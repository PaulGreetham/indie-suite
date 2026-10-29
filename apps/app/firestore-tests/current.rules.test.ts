import { readFileSync } from "node:fs"
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest"
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore"

// Characterisation tests for firestore.rules as published. Later WS-6 fixes tighten the rules and flip
// the "currently allowed" cases below.

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
    await setDoc(doc(db, "billing/alice"), { status: "trialing", plan: "pro" })
    await setDoc(doc(db, "billing/bob"), { status: "active", plan: "pro" })
    await setDoc(doc(db, "billing/carol"), { status: "canceled", plan: "pro" })
    await setDoc(doc(db, "settings_trading_details/biz-alice"), { ownerId: "alice", name: "Alice Music" })
    await setDoc(doc(db, "settings_trading_details/biz-bob"), { ownerId: "bob", name: "Bob Music" })
    await setDoc(doc(db, "customers/c-alice"), { ownerId: "alice", businessId: "biz-alice", fullName: "Ada" })
    await setDoc(doc(db, "customers/c-carol"), { ownerId: "carol", businessId: "biz-carol", fullName: "Cy" })
    await setDoc(doc(db, "contracts/k-alice"), { ownerId: "alice", firmaId: "sr_1", status: "draft" })
    await setDoc(doc(db, "integrations_firma/biz-alice"), { businessId: "biz-alice", workspaceApiKey: "secret" })
    await setDoc(doc(db, "stripe_events/evt_1"), { type: "customer.subscription.updated" })
  })
})

function as(uid: string) {
  return env.authenticatedContext(uid, { email_verified: true }).firestore()
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
})

describe("plan gate", () => {
  it("denies an owner whose subscription is cancelled", async () => {
    await assertFails(getDoc(doc(as("carol"), "customers/c-carol")))
    await assertFails(setDoc(doc(as("carol"), "customers/new"), { ownerId: "carol", businessId: "biz-carol", fullName: "x" }))
  })

  it("denies a user with no billing record", async () => {
    await assertFails(setDoc(doc(as("dave"), "customers/new"), { ownerId: "dave", businessId: "biz-dave", fullName: "x" }))
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
    await assertFails(setDoc(doc(as("alice"), "settings_trading_details/new"), { ownerId: "alice", name: "Second" }))
    await assertFails(setDoc(doc(as("alice"), "contracts/new"), { ownerId: "alice", businessId: "biz-alice", title: "x" }))
  })

  it("denies client updates to contracts but allows the owner to delete", async () => {
    await assertFails(updateDoc(doc(as("alice"), "contracts/k-alice"), { firmaId: "sr_other" }))
    await assertSucceeds(deleteDoc(doc(as("alice"), "contracts/k-alice")))
  })
})

describe("create", () => {
  it("allows creating a record owned by the caller with a businessId", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "customers/new"), { ownerId: "alice", businessId: "biz-alice", fullName: "x" }))
  })

  it("denies creating a record for another owner or without a businessId", async () => {
    await assertFails(setDoc(doc(as("alice"), "customers/new"), { ownerId: "bob", businessId: "biz-bob", fullName: "x" }))
    await assertFails(setDoc(doc(as("alice"), "customers/new2"), { ownerId: "alice", fullName: "x" }))
  })

  it("currently allows a businessId the caller does not own (R-01b, tightened in WS-6b)", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "customers/new"), { ownerId: "alice", businessId: "biz-bob", fullName: "x" }))
  })
})

describe("update", () => {
  it("allows the owner to update their record", async () => {
    await assertSucceeds(updateDoc(doc(as("alice"), "customers/c-alice"), { fullName: "Ada L" }))
  })

  it("denies another tenant updating it", async () => {
    await assertFails(updateDoc(doc(as("bob"), "customers/c-alice"), { fullName: "pwned" }))
  })

  it("currently allows rewriting ownerId and adding arbitrary fields (R-01a, tightened in WS-6b)", async () => {
    await assertSucceeds(updateDoc(doc(as("alice"), "customers/c-alice"), { ownerId: "bob", anything: true }))
  })
})
