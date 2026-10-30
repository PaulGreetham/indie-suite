# Phase 2: Security Audit

Audit date: 2026-10-28. Audited commit: `c742252` on `chore/audit-phase-1` (application code is unchanged since `7a5ddec` on `main`).
Scope: this was a read-only review of all 16 API routes in `apps/app`, every client-side Firestore call, the marketing OG route, the Stripe, Firma and PDF integrations, secrets handling, PII handling, and `npm audit`. I did not change any code.

This builds on `audit/00-architecture.md`. Findings already listed there (R-01 to R-18) are referenced by ID and only repeated here when Phase 2 found new detail. New findings are numbered **S-01 onwards**. Severities use the same two columns as §7.5: **Inherent** (once real paying tenants exist) and **Now** (live, no paying customers, no trials).

---

## Summary

- **Only 1 of the 16 API routes is fully correct on authentication and ownership** (`GET /api/contracts/list`). The Stripe webhook is also correct for its own model, which is signature verification. Seven routes have **no authentication at all**. Six authenticate the caller but check ownership in a way that fails open (R-09). No route checks `email_verified`.
- **Main new issue (S-01): server routes follow IDs that users control.** The Firestore rules do stop the browser from reading another tenant's documents. But an owner can write *any* ID into their own documents (R-01a), and the Admin-SDK routes then load whatever document that ID points to without checking who owns it. So **adding an invoice-ownership check to the PDF routes (the obvious fix for R-02) is not enough**. A user could still set `bank_account_id` on their own invoice to another tenant's bank account and render that account into their own PDF.
- **Stripe identity is the email address (S-02).** The obvious fix for R-04, using the email from the ID token, is still exploitable. Firebase hands out tokens for unverified emails, and emails can be changed and then re-registered by someone else. The fix has to link Stripe to the **uid**.
- **Browser-side Firestore is safe for reads.** Every client read is either owner-filtered or a fetch by ID that the rules block for foreign documents. Writes are owner-scoped, but their content isn't validated (R-01a/b), which is what makes S-01, R-11 and R-17b possible.
- **Dependencies:** 51 advisories (6 critical, 25 high). The one that matters at runtime is **Next.js 15.5.7** in both apps (RSC DoS, Image Optimizer RCE advisories). A non-major upgrade to 15.5.28 fixes them. Most other criticals are build-time, dev-only or unreachable (§3.5).
- **Secrets:** git history is clean, and no server env var is referenced from client code. The remaining secret-exposure problems are the ones already known (R-07/R-01c Firma keys in Firestore, R-15 root `.env.local`).
- **PII/compliance (S-09):** there's no privacy policy (the footer links to `#`), no account deletion or export, and customer PII is copied into invoices and kept after the customer is deleted.

---

## 1. API route matrix

Legend: ✅ correct · ⚠️ partial or fail-open · ❌ none · n/a = not applicable.
"Admin SDK" means the route reads or writes Firestore with the service account, which **bypasses the security rules**. For those routes, the route's own code is the only access control.

| # | Route | Caller in app | AuthN | Ownership / authZ | Admin SDK | External | Findings |
|---|---|---|---|---|---|---|---|
| 1 | `POST /api/contracts/backfill-owner` | **none** | ❌ | ❌. Assigns every `ownerId == null` contract to a uid taken from the request body | ✅ write | n/a | R-05. Dead route, delete it |
| 2 | `POST /api/contracts/create` | `contracts/create/page.tsx:97` | ✅ Bearer (`:10-13`) | ⚠️ event owner fails open (`:24`). `businessId`, `customerId`, `venueId`, `invoiceId`, `firmaId`, `recipients` and `contractData` are stored **unchecked** | ✅ write | n/a | R-09, R-11 |
| 3 | `POST /api/contracts/generate` | `contracts/create/page.tsx:60` | ⚠️ **skipped if Admin env vars are missing** (`:48-60`) | ⚠️ event owner fails open (`:68`). **Customer and venue loaded from `event.customerId/venueId` with no owner check** (`:70-77`). Business via provisioning, fails open | ✅ read + write (provisioning) | Firma (company key or workspace key) | R-10, R-17, R-09, **S-01**, **S-03** |
| 4 | `GET /api/contracts/list` | `contracts/all/page.tsx:51` | ✅ | ✅ strict `uid !== ownerId → 403` (`:16`) | ✅ read | n/a | OK. The `?ownerId=` parameter is redundant and puts the uid into URLs and logs (S-06) |
| 5 | `POST /api/contracts/send` | `contracts/[id]/page.tsx:33`, `contracts/all/page.tsx:133` | ✅ | ⚠️ contract owner fails open (`:34`). Business fails open. `firmaId` is trusted. Falls back to the **company** Firma client (`:37`) | ✅ read + write | Firma | R-09, R-11 |
| 6 | `GET /api/firma/templates` | **none** | ❌ | ❌ | ❌ | Firma, **company key** | R-08. Dead route, delete it |
| 7 | `POST /api/firma/templates/create` | `contracts/templates/page.tsx:134` | ✅ | ⚠️ business owner fails open (`provisioning.ts:27,97`) | ✅ write | Firma | R-17, R-09, S-03, S-10 |
| 8 | `GET /api/firma/templates/status` | `contracts/templates/page.tsx:77` | ✅ | ⚠️ fails open. **The GET has side effects**: it creates and attaches Firma workspaces | ✅ write | Firma, company key | R-17, R-09, **S-03** |
| 9 | `POST /api/firma/templates/token` | `contracts/templates/page.tsx:103` | ✅ | ⚠️ business fails open (`provisioning.ts:82`). The template is scoped to the workspace key, which is acceptable | ✅ read | Firma | R-09 |
| 10 | `GET /api/invoices/[id]/pdf` | **none** (the invoices page uses `/api/pdf`) | ❌ | ❌. Also loads `bank_account_id` and `eventId` without an owner check (`:27-31`, `:49-52`) | ✅ read | Chromium | R-02, **S-01**. Dead but reachable |
| 11 | `GET /api/invoices/[id]/receipt` | `invoices/receipts/page.tsx:94,99` (opens in a new tab with no token) | ❌ | ❌. Forces `status: "paid"` | ✅ read | Chromium | R-02, R-12, **S-08** |
| 12 | `POST /api/pdf` | `invoices/all/page.tsx:198` (no token sent) | ❌ | ❌. Renders the **client-supplied invoice JSON**. Loads any bank account by `bank_account_id`, or by `ownerId`+`businessId` from the body. Loads any event by `eventId` (`:61-65`, `:101-105`) | ✅ read | Chromium | R-03, **S-01** |
| 13 | `POST /api/stripe/create-checkout-session` | `signup/verified/page.tsx:54` (no token sent) | ❌ | ❌. Trusts `email` from the body and attaches the session to whichever Stripe customer has that email | ❌ | Stripe | R-04, **S-02** |
| 14 | `POST /api/stripe/create-portal-session` | settings (billing, subscriptions, trading-details), `team-switcher.tsx:197` | ❌ | ❌. Accepts any `customerId` or `email` | ❌ | Stripe | R-04, **S-02** |
| 15 | `POST /api/stripe/get-subscription` | `subscriptions/page.tsx:97`, `trading-details/page.tsx:29`, `team-switcher.tsx:55` | ❌ | ❌. Anyone can look up a subscription by email | ❌ | Stripe | R-04, **S-02** |
| 16 | `POST /api/stripe/webhook` | Stripe | ✅ **signature** (see §3.2) | n/a | ❌ | Stripe | R-06 (no-op) |
| (m) | `GET /og` (marketing, edge) | social cards | public by design | n/a | ❌ | n/a | S-10 (minor) |

**Totals:** 7 of 16 have no authentication (#1, 6, 10, 11, 12, 13, 14, 15). That is 8 if you count #3, which drops authentication when Admin isn't configured. 6 have fail-open ownership checks (#2, 3, 5, 7, 8, 9). 1 is fully correct (#4). 3 are dead (#1, 6, 10). None checks `email_verified` or calls `verifyIdToken(token, true)` to check for revocation (S-08). Every route copies the same 3 lines of Bearer parsing; there's no shared helper.

---

## 2. Client-side Firestore access versus the live rules

The rules (§7.1 of Phase 1) come down to this: **read, update and delete are allowed only if the existing document's `ownerId == uid`**. Create is allowed for 7 collections, as long as `ownerId == uid` (and, for 6 of them, `businessId is string`). Nothing else is checked.

### 2.1 Reads: all safe

| Collection | Call sites | Pattern | Safe under rules? |
|---|---|---|---|
| `settings_trading_details` | `business-context.tsx:45`, `team-switcher.tsx:79`, `app-sidebar.tsx:35`, `user-settings.ts:30,229` | `where ownerId == uid` | ✅ (but the owner can read `firma.workspaceApiKey`, see R-01c/R-07) |
| `settings_bank_accounts` | `user-settings.ts:118`; `invoices/all/page.tsx:185` (`getDoc` by `invoice.bank_account_id`) | owner query; get by ID | ✅. A foreign ID is denied in the browser. **The server-side equivalent isn't protected (S-01)** |
| `customers`, `venues` | list pages, `EventForm.tsx:56-57`, `InvoiceForm.tsx:78-80`; `getDoc` by ID in `events/all:165,174`, `events/calendar:122,129`, `contracts/create:39,45`, `OverviewTopCustomers.tsx:70` | owner query; get by ID from `event.customerId/venueId` | ✅ (a foreign ID is denied) |
| `events` | list pages, analytics hooks, `ContractForm.tsx:47`, `contracts/create:29`, `contracts/all:83` | owner query; get by ID | ✅ |
| `invoices` | list pages, analytics, notification feed, `invoices.ts:78,104` (uniqueness check) | owner query | ✅ |
| `invoices` | `BookingsChart.tsx:30` (whole collection) | unfiltered | ✅ denied; dead component (R-18 class) |
| `contracts` | `contracts/all:63` | owner query | ✅ |
| `contracts` | `contracts/all:64` (`ownerId == null`), `:69` (whole collection) | unfiltered | ✅ denied (R-18) |
| `contracts` | `contracts/[id]/page.tsx:21`, `contracts/all:119` | get by ID | ✅ |

### 2.2 Writes: owner-scoped, but the content isn't validated

| Collection | Call sites | What the rules allow beyond the UI's intent | Consequence |
|---|---|---|---|
| `settings_trading_details` | create `user-settings.ts:55`; update `:76`; delete `:94` | Update can set `ownerId`, `firma.*` and any other field. Delete orphans every child record **and leaves the Firma workspace in the company account, where `findWorkspaceByName` can match it again** (R-17) | R-01a, R-01c, R-17b, R-16 |
| `settings_bank_accounts` | `user-settings.ts:141,159,173` | `businessId` can be any string; fields aren't validated | R-01a/b |
| `customers` / `venues` / `events` | `customers.ts:58,75,81`, `venues.ts:51,67,73`, `events.ts:34,49,55` | `businessId` is taken from `localStorage` and not verified (R-13). **`events.customerId` / `venueId` can be set to any ID**, and `/api/contracts/generate` then loads that ID with the Admin SDK | R-01a/b, R-13, **S-01** |
| `invoices` | `invoices.ts:89` (create spreads the **entire input**), `:116` (update spreads the input), `:124` | Any field, including **`bank_account_id` pointing at another tenant's account** and `eventId` pointing at another tenant's event. The `/api/pdf` and `/api/invoices/[id]/*` routes then load those documents with the Admin SDK | R-14, **S-01** |
| `contracts` | update `contracts.ts:22`, delete `:28` | `firmaId`, `businessId`, `status`, and **`recipients[].email`** can be rewritten. On a Firma validation error, `/api/contracts/send` copies the saved recipient into the signing request (`send/route.ts:48-61`), so an owner can redirect a signing request to any address. That's the same abuse class as R-10 | R-11 (new detail) |
| `contracts` | create `contracts.ts:14` (`createContract`) | **denied by the rules**. Dead code; the server route is used instead | delete |
| all | `user-settings.ts:190-216` `backfillBusinessIdForOwner` | owner-scoped, harmless, **no callers** | delete |

**Overall verdict:** used on its own, the browser can't read or modify another tenant's data under the current rules. The remaining client-side risks are integrity risks (R-01a/b, R-13, R-14). They turn into **confidentiality** risks only when a server route follows a reference the client wrote, which is S-01.

---

## 3. Other checklist items

### 3.1 Public and shareable links
- The app has **no intentionally public pages** (no public invoice view, booking page or share link). Firebase action links (verify email, reset password) are handled by Firebase.
- The only bearer-style URLs are the unauthenticated PDF endpoints (R-02). The receipts page opens `/api/invoices/{id}/receipt` in a new tab (`receipts/page.tsx:94`), so the invoice ID ends up in browser history and Vercel request logs. That's what makes R-02 exploitable. Once authentication is added, this `window.open` pattern will stop working (a new tab can't send a Bearer header), so the client has to switch to fetch-with-token plus a blob URL (**S-08**).
- Firma signing URLs (`contracts.firmaUrl`) are stored in owner-only contract documents. ✅
- Marketing `/og?title=` renders any text on an IndieSuite-branded card (S-10, low).

### 3.2 Stripe
- **Webhook verification is correct.** It reads the raw body with `req.arrayBuffer()`, uses `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`, rejects a missing signature or secret with 400, and runs on `runtime = "nodejs"` (`webhook/route.ts:8-19`). Gaps: it does nothing with the events (R-06), it has no event-ID idempotency store, and it can't map an event to a user because checkout never sets `client_reference_id` or `metadata.uid` (S-02).
- The checkout, portal and lookup routes have no authentication and identify the customer by email (R-04, extended in **S-02**).
- `getAppBaseUrl()` (`lib/stripe/server.ts:49-55`) uses `NEXT_PUBLIC_SITE_URL`, then `VERCEL_URL`. That's fine for redirects. It can't be redirected to an attacker's host because it isn't read from request headers. ✅

### 3.3 Secrets
- **Git history is clean.** A pattern scan of every commit (`sk_live/test`, `rk_`, `whsec_`, `BEGIN PRIVATE KEY`, `"private_key"`, Mapbox `pk.eyJ`) found no matches. Only the two `.env.example` files are tracked, and they're empty templates. `.env*` and `*.pem` are git-ignored. ✅
- **No server-only env var is referenced in any `"use client"` file**, and no client file imports `lib/firma/server.ts` (as Phase 1 already showed). ✅
- The secrets still exposed are already known: Firma workspace API keys in client-readable `settings_trading_details` documents (R-07/R-01c). The workspace keys of any business that has gone through provisioning should be **rotated** once they're moved, because every owner has been able to read them. The other two: `NEXT_PUBLIC_FIRMA_API_KEY` still listed in `.env.example` (R-08), and the root `.env.local`, which also has mode **`0644`** (readable by any local user) (R-15).
- Public-by-design keys: the Firebase web API key and the Mapbox token. Restrict both by HTTP referrer in the GCP and Mapbox consoles, and enable Firebase **App Check**. Without App Check, anyone can call Firestore and Auth directly with the public config, so every UI-only check (plan limits, the email-verified gate) is decorative.
- `FIREBASE_PRIVATE_KEY` is parsed correctly (`admin.ts:27`). The file's header comment is wrong (R-15).

### 3.4 PII handling
PII held: customer and venue names, emails, phones and postal addresses; **bank account numbers, IBANs and sort codes**; contract signer names and emails; user email (Firebase Auth and Stripe).
- **Processors:** Firebase/GCP, Vercel, Stripe, Firma (signer PII and contract content are sent as `custom_fields`, see `generate/route.ts:111-119`), and Mapbox (venue addresses are geocoded). None of these is disclosed anywhere, because there is no privacy policy (S-09).
- **Data copied into invoices:** customer and venue details are copied into each invoice (`invoices` schema, Phase 1 §4). Deleting a customer doesn't remove those copies, and nothing cascades (R-16).
- **No account deletion or data export** anywhere in the app (no `deleteUser`, no export). That's a GDPR/UK-GDPR gap for a live product (S-09).
- **Logging:** server routes log only error messages, not payloads. ✅ But several routes **return raw upstream error text** to the client: Firma errors, provisioning exceptions, and the full signing request in `send/route.ts:63,66`. See S-06.
- **Browser storage:** `activeBusinessId`, `businessName` and `subscriptionPlan` live in `localStorage` and aren't cleared on sign-out (`nav-user.tsx:156-159`). On a shared device the next user inherits them (S-07).
- PDFs are streamed and never stored. ✅ Vercel Analytics collects no PII by default. ✅

### 3.5 Dependencies (`npm audit`, run at the repo root)

**51 advisories: 6 critical, 25 high, 19 moderate, 1 low.** Here is what's reachable:

| Package (installed) | Severity | Path | Reachable at runtime? | Fix |
|---|---|---|---|---|
| **`next` 15.5.7** (both apps, direct) | critical/high | direct | **Yes.** The RSC/Server Components DoS advisories apply to any App Router app. The Image Optimizer RCE advisories (SVG/AVIF) apply wherever `next/image` is used, which includes app login, signup and layout, and marketing. Vercel's managed image optimisation probably mitigates the RCE, but I haven't verified that. The middleware-bypass advisories don't apply (there's no middleware) | `next@15.5.28` in **both** apps (non-major) |
| `handlebars` 4.7.9 (direct) | critical | direct | **No in practice.** The JS-injection CVEs need an attacker-controlled *template*, and `invoice-template.ts` compiles a constant. `{{…}}` escaping is in effect and there's no `noEscape` or triple-stache | Upgrade (non-major fix available) |
| `protobufjs`, `@grpc/grpc-js`, `node-forge`, `jws`, `google-gax`, `uuid` | critical/high/mod | `firebase-admin@13.7.0` | Low. They parse trusted Google responses. The `jws` HMAC flaw doesn't affect RS256 ID-token verification | `firebase-admin@14` (**major**, regression-test the Admin routes) |
| `basic-ftp`, `extract-zip`, `@puppeteer/browsers`, `chromium-bidi`, `zod` | critical/high | `puppeteer-core@23.11.1` | No. This is browser-download tooling, and the app uses the `@sparticuz/chromium` binary | `puppeteer-core@25` (**major**; must match the `@sparticuz/chromium` major) |
| `websocket-driver` | critical | `firebase` → `@firebase/database` | No. Realtime Database isn't used | `npm audit fix` |
| `tar` | critical | `@tailwindcss/oxide` (build) | Build-time only | `npm audit fix` |
| `undici`, `vitest`, `@vitest/mocker`, `vite`, `flatted`, `minimatch`, etc. | high/mod | jsdom, vitest, eslint | Dev/test only | `npm audit fix` |

Recorded as **S-04**. CI doesn't run `npm audit`.

### 3.6 Platform hardening
- No CSP or security headers (R-15). Phase 2 detail: `FirmaTemplateEditor.tsx:60-66` injects `https://api.firma.dev/functions/v1/embed-proxy/template-editor.js` into the authenticated origin with **no SRI**. Firebase Auth tokens live in IndexedDB on that origin, so a compromise of that script means account takeover. A CSP `script-src` allow-list limits the damage (S-05).
- There's no rate limiting anywhere. The unauthenticated Chromium routes (R-02, R-03, R-12) and the Firma provisioning route (S-03) are the cost and DoS hot spots.

---

## 4. New findings

| ID | Inherent | Now | Location | Problem | Fix | Confidence |
|---|---|---|---|---|---|---|
| **S-01** | **High** | Medium | `api/pdf/route.ts:23-41,61-65,101-105`; `api/invoices/[id]/pdf/route.ts:27-31,49-52`; `api/contracts/generate/route.ts:70-77,128-130` | **Cross-tenant reads through references the user controls.** Admin-SDK routes load `bank_account_id`, `eventId`, `event.customerId`, `event.venueId` and `event.businessId` without checking that the referenced document belongs to the caller. The rules let an owner write any ID into their own invoice or event (R-01a). So once R-02/R-03 are fixed with an invoice-ownership check, a logged-in user can **still render another tenant's bank details** into their own invoice PDF, or pull another tenant's customer name, email and company into a `generate` response (`recipients`, `contractData`). This needs the victim's document ID (random, around 120 bits), which is why "Now" is Medium | Load every referenced document through one `loadOwned(collection, id, uid)` helper that returns 404 unless `ownerId === uid`. Also enforce in the rules that `bank_account_id`, `customerId`, `venueId` and `eventId` point to the caller's own documents (`get()` checks), or validate them server-side on write | High |
| **S-02** | **Critical** | Low | `api/stripe/*`; `settings/general/page.tsx:107` (`verifyBeforeUpdateEmail`) | **R-04 can't be fixed by trusting the token email.** (a) Firebase issues ID tokens to unverified accounts, so anyone can sign up as `victim@x.com` and get a token with `email = victim@x.com`, `email_verified = false`. (b) After a user changes email, their old address can be registered by someone else, who then matches the old Stripe customer. (c) Checkout sets no `client_reference_id` or `metadata.uid`, so the webhook can never tie a subscription to a uid. (d) The 30-day trial is granted per *email* that has no Stripe customer yet, so trials can be farmed with throwaway accounts | Keep a server-only `billing/{uid}` document with `stripeCustomerId`. On first checkout, create the Stripe customer with `metadata.uid` and set `client_reference_id = uid`. Portal and lookup use **only** the stored ID. Require `email_verified` before checkout. Allow one trial per uid | High |
| **S-03** | Medium | Low | `lib/firma/provisioning.ts:47-71`; `api/firma/templates/status/route.ts:17` | **Unbounded Firma workspace creation from a GET.** Every business that hits `status`, `create` or `generate` gets a new workspace in the company Firma account. Business count is limited only in the UI (R-06) and businesses can be deleted and recreated freely, so one user can create any number of workspaces (quota or cost exhaustion, plus orphans that R-17 can then match by name) | Make `status` read-only. Provision only from an explicit POST. Enforce the per-plan business limit server-side. Delete the workspace when its business is deleted | High |
| **S-04** | High | Medium | `package-lock.json` | Vulnerable dependencies (§3.5). Next.js 15.5.7 is the runtime-relevant one | Upgrade Next in both apps. Run `npm audit fix`. Plan the `firebase-admin@14` and `puppeteer-core@25` majors. Add `npm audit --omit=dev --audit-level=high` to CI | High |
| **S-05** | Medium | Low | `components/firma/FirmaTemplateEditor.tsx:60-66` | A third-party script is loaded into the authenticated origin without SRI or a CSP | Add a CSP (`script-src 'self' https://api.firma.dev …`). Add SRI if Firma publishes versioned hashes | Medium |
| **S-06** | Low | Low | `generate/route.ts:29,125,141,172`; `send/route.ts:63,66`; `firma/templates/*`; `pdf` routes `:95/:125`; `contracts/all/page.tsx:51` | Raw internal and upstream error messages, and the full Firma signing request, are returned to the browser. The uid is sent in a query string (`?ownerId=`), so it ends up in logs | Return generic error codes and log details server-side. Drop the `ownerId` parameter and use the token uid | High |
| **S-07** | Low | Low | `components/nav-user.tsx:156-159`; `lib/firebase/user-settings.ts:219-234` | Sign-out doesn't clear `activeBusinessId`, `businessName` or `subscriptionPlan`. On a shared browser the next user sees the previous user's business name, and the stale `activeBusinessId` is written into the new user's records. The rules accept it because `businessId is string` (R-01b, R-13) | Clear both storages on sign-out. Key stored values by uid. Fix R-01b | High |
| **S-08** | Low | Low | every authenticated route; `receipts/page.tsx:94`; `invoices/all/page.tsx:198` | No route checks `email_verified` or token revocation. This is the server-side counterpart of R-01d. The PDF callers send no token and use `window.open`, so they'll break once R-02/R-03 are fixed unless they're changed in the same PR | Do both inside `requireUser`. Switch the PDF downloads to `fetch` with a Bearer token plus a blob URL | High |
| **S-09** | Medium (compliance) | Medium | `apps/marketing/src/components/sections/footer.tsx:45-51`; app (no deletion or export) | No privacy policy or terms (the links go to `#`). No account deletion or data export. PII copied into invoices outlives deleted customers. Sub-processors (Firma, Stripe, Mapbox, Vercel, GCP) aren't disclosed, though the app holds bank details and third-party PII | Publish a privacy policy and terms. Add account deletion (cascade plus Firma workspace cleanup plus Stripe) and export. Define retention. Sign DPAs with Firma and the other processors | High |
| **S-10** | Low | Low | `apps/marketing/src/app/og/route.tsx:10`; `api/firma/templates/create/route.ts:31-32` | The OG route renders arbitrary `title` text on a branded card (spoofed social previews). Template upload skips the PDF type check when `document.type` is empty, and its 20 MB limit is above Vercel's 4.5 MB request-body cap | Cap and allow-list OG titles (or drop the parameter). Require `application/pdf` and check the magic bytes. Align the size limit | High |

**Existing findings with new Phase 2 detail:** R-02 (also follows `bank_account_id` and `eventId`, see S-01; the route has no caller), R-04 (see S-02 for why the token email isn't enough), R-07 (rotate the workspace keys after migrating them), R-11 (`recipients[].email` can be rewritten, and `send` copies it into Firma), R-15 (`.env.local` mode 0644; Firma script without SRI), R-17 (a deleted business leaves its workspace available for name matching).

---

## 5. Combined fix plan (Phase 1 + Phase 2)

The plan is ordered by priority. Each workstream is one PR or a small set of PRs, grouped so that shared plumbing is built once. "Blocks" means it has to land before the milestone named.

### P0: now (live product, before any marketing)

**WS-1. Delete dead and dangerous code** (about 1 hour, no dependencies)
- Delete `api/contracts/backfill-owner` (R-05), `GET api/firma/templates` (R-08) and `api/invoices/[id]/pdf` (R-02; no caller, and WS-3 replaces it).
- Delete the client dead code: `createContract` (`lib/firebase/contracts.ts:8`), `backfillBusinessIdForOwner`, the `contracts/all` fallback queries (R-18) and `BookingsChart` (unfiltered read).
- Remove `NEXT_PUBLIC_FIRMA_API_KEY` / `NEXT_PUBLIC_FIRMA_API-KEY` from `lib/firma/server.ts:94-102` and `.env.example` (R-08).

**WS-2. Shared server auth layer, applied to every route** (fixes R-09, R-10, S-01, S-06, S-08; the base for WS-3 to WS-5)
- New `src/lib/server/auth.ts`:
  - `requireUser(req, { verifiedEmail = true })`: parses the Bearer token, calls `verifyIdToken(token, true)`, requires `email_verified`, and throws a typed 401/403.
  - `loadOwned(collection, id, uid)`: Admin get that returns 404 unless `data.ownerId === uid`. It **fails closed** on a missing `ownerId` (R-09).
  - `jsonError(code, status)`: generic error responses, with details logged server-side (S-06).
- Apply it to all remaining routes. Remove the `hasAdmin` bypass and the client-`data` branch from `contracts/generate` (R-10). Load the event, customer, venue and business through `loadOwned` (S-01). Drop `?ownerId=` from `contracts/list`.
- Unit-test the helpers (mock `getAdminAuth`), plus one test per route covering 401 (no token), 403 (another user's ID) and 404 (missing `ownerId`).

**WS-3. Single PDF pipeline** (fixes R-02, R-03, R-12, S-01 for PDFs, S-08; depends on WS-2)
- One `renderInvoicePdf({ invoiceId, uid, asReceipt })` helper: loads the invoice with `loadOwned`, loads the bank account and event with `loadOwned` (S-01), and **never accepts a client payload** (R-03). It closes Chromium in `try/finally` and uses a sanitised, quoted `Content-Disposition` filename (R-12).
- Routes: `GET /api/invoices/[id]/pdf` (rebuilt on the helper) and `/receipt`. Retire `POST /api/pdf`. Register both routes in `vercel.json` **and** `outputFileTracingIncludes` (R-12).
- Client: `invoices/all` and `invoices/receipts` switch to `fetch` with a Bearer token plus a blob URL (S-08). Use an explicit `paidAt` for receipts (R-14, partial).
- Add basic rate limiting on this route (Vercel WAF rule or Upstash), since it launches Chromium.

**WS-4. Firma tenancy rebuild** (fixes R-17, R-17b, R-07, R-01c, R-11, S-03; depends on WS-2; do it before more tenants use contracts)
- Move the integration into server-only `integrations_firma/{businessId}`, with rules `allow read, write: if false` (R-01c, R-07). Migrate the existing `settings_trading_details.firma` data, then delete the field. **Rotate the existing workspace API keys.**
- Never use `findWorkspaceByName`. Create the workspace once, named or tagged with the immutable `businessId` (R-17). Audit the existing company workspaces for duplicate or shared mappings.
- `templates/status` becomes read-only. Provisioning only happens through an explicit POST, and is subject to the server-side business limit from WS-5 (S-03). Clean up the workspace when its business is deleted.
- Merge `contracts/generate` and `contracts/create` into one server call that creates the signing request and saves the contract. `firmaId`, `recipients` and `businessId` then never come from the client (R-11). `send` uses only the business's integration and never the company fallback.

### P0b: before any paid signups or trials

**WS-5. Billing linked to uid, webhook and entitlements** (fixes R-04, R-06, S-02; depends on WS-2)
- Server-only `billing/{uid}` document: `{ stripeCustomerId, subscriptionId, status, plan, currentPeriodEnd, trialUsed }`.
- Checkout: `requireUser` with a verified email, create or reuse the customer by **stored ID** with `metadata.uid`, set `client_reference_id = uid`, and allow one trial per uid (S-02).
- Portal and get-subscription: authenticated, using the stored ID only. Never accept `customerId` or `email` from the client (R-04).
- Webhook: handle `checkout.session.completed` and `customer.subscription.*`, write `billing/{uid}`, and make it idempotent with a `stripe_events/{eventId}` record (R-06).
- Entitlements: a server helper `requireActivePlan(uid)` for the API routes, and a mirror in custom claims or a rules-readable `entitlements/{uid}` so the rules can gate creates. Enforce the business limit server-side, for example by creating businesses through an API route or with a rules check against entitlements (R-06, S-03). Stop caching the plan in `localStorage`.

### P1: next 2 to 4 weeks

**WS-6. Firestore rules v2, versioned and tested** (fixes R-01a, b, d, e, f, R-13, R-14, S-01 at the rules layer, S-07 partial)
- Commit `firebase.json`, `firestore.rules` and `firestore.indexes.json` (R-01f).
- Split the rules per collection:
  - Update keeps `ownerId` and `businessId` immutable.
  - Use `affectedKeys().hasOnly([...])` allow-lists, and deny `firma` (moot after WS-4).
  - Create checks that the `businessId` refers to a business the caller owns, using `get()` (R-01b, R-13).
  - Reference fields (`bank_account_id`, `customerId`, `venueId`, `eventId`) must point to the caller's own documents, or be validated in WS-2 (S-01 defence in depth).
  - Add `email_verified` to `isAuthed()` (R-01d), plus type and size checks (R-01e).
  - Gate creates on entitlements from WS-5.
- Add `@firebase/rules-unit-testing` tests running against the emulator in CI.
- Invoice numbering through a transaction and counter doc or a server route, plus a field allow-list (R-14).
- Clear session and local storage on sign-out and key stored values by uid (S-07).

**WS-7. Dependency upgrades and CI gate** (fixes S-04)
- `next@15.5.28` in both apps and `handlebars` patch: this week, low risk.
- Run `npm audit fix` for transitive dependencies.
- Plan the `firebase-admin@14` and `puppeteer-core@25` (with a matching `@sparticuz/chromium`) majors. Regression-test the Admin routes and PDF rendering.
- Add `npm audit --omit=dev --audit-level=high` to `ci.yml`. Enable Dependabot or Renovate.

**WS-8. Platform hardening** (fixes R-15, partly S-05 and S-10)
- `headers()` in both `next.config.ts` files: CSP (Firebase, Stripe, Mapbox, `api.firma.dev`), HSTS, `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy` (R-15, S-05).
- Turn on Firebase App Check. Restrict the Firebase API key and Mapbox token by referrer (§3.3).
- Rate limiting on the PDF, Firma and Stripe routes.
- Harden the OG route and template upload (S-10).

### P2: before scaling or onboarding EU/UK customers widely

**WS-9. Privacy and data lifecycle** (fixes S-09, R-16)
- Privacy policy and terms, with sub-processors listed. DPAs with Firma and the others.
- Account deletion: a server route that cascades across all collections, deletes the Firma workspace and the Stripe customer, then deletes the Auth user. Data export (JSON/CSV).
- Delete semantics for business, customer, venue and event (cascade or block). Decide whether invoices keep copied PII as a legal record, and document the retention period.
- Compute or maintain `eventsLinked` and `totalValue` (R-16).

**WS-10. Repo hygiene** (fixes R-15 remainder)
- Delete the stale `apps/app/next.config.js`, the tracked `node_modules/.vite` artefact and the root leftovers.
- Delete or `chmod 600` the root `.env.local`.
- Sync `.env.example` with the variables the code actually reads.
- Fix the misleading `admin.ts` header comment.

### Dependency order at a glance
```
WS-1 ─┐
WS-7a (next/handlebars) ── independent, do now
WS-2 ─┬─> WS-3 (PDF)
      ├─> WS-4 (Firma) ─┐
      └─> WS-5 (Billing) ┴─> WS-6 (Rules v2 gates on entitlements; firma field gone)
WS-8, WS-9, WS-10 independent after WS-2
```
