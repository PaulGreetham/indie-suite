# Phase 1: Architecture Map

Audit date: 2026-10-28. Audited commit: `7a5ddec` on `main`. One uncommitted change existed at the time, in `apps/marketing/package.json` (it adds `@radix-ui/react-dropdown-menu`).
Scope: this was a read-only review of every tracked source and config file under `apps/`, `packages/` and the repo root. I did not change any code.

> **Heads-up: the code doesn't match the product description.** The brief describes a CRM with contacts, a booking system with scheduling/availability, email notifications, calendar sync and file storage. The code has less than that:
> - **CRM**: there is a flat `customers` collection. There is no separate contacts model, no activity log and no pipeline.
> - **Bookings**: "bookings" are `events` documents (title, start, end, customer, venue). There is no availability, no slot booking, no conflict detection and no public booking page.
> - **Email/notifications**: the app does not send any email of its own. The only emails come from Firebase Auth (verification) and Firma (signing requests). The "Notification Feed" is a client-side list built from your own events, invoices and contracts.
> - **Calendar sync**: none. No iCal, Google or Outlook integration.
> - **File storage**: none. `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` is configured, but `firebase/storage` is never imported. Generated PDFs are streamed back to the browser and never stored.
> - **Migrations**: none. Firestore has no schema, and the repo has no migration scripts. There are two ad-hoc "backfill" helpers, covered below.

---

## 1. Tech stack and deployment

| Layer | Choice | Where |
|---|---|---|
| Monorepo | npm workspaces (`apps/*`, `packages/*`). No Turbo or Nx. `npm@11.6.2` | `package.json` |
| Framework | Next.js **15.5.7** (App Router), React **19.1.0**, TypeScript 5.9.3 (strict) | `apps/*/package.json`, `packages/tsconfig/base.json` |
| Styling/UI | Tailwind v4, shadcn/ui (new-york), Radix primitives, lucide icons, `next-themes` | `components.json`, `apps/*/src/components/ui` |
| Auth | Firebase Auth (email + password) on the client, Firebase Admin `verifyIdToken` on the server | `apps/app/src/lib/firebase/*` |
| Database | **Cloud Firestore**, used mostly **directly from the browser** through the web SDK. API routes use the Admin SDK | `lib/firebase/client.ts`, `lib/firebase/admin.ts` |
| Payments | Stripe (Checkout + Billing Portal) using `stripe@19` and `@stripe/stripe-js@8` | `lib/stripe/*`, `app/api/stripe/*` |
| E-signature | Firma (`api.firma.dev`), called through a hand-written REST client | `lib/firma/*` |
| PDF | `puppeteer-core` + `@sparticuz/chromium` (HTML through Handlebars), with `@react-pdf/renderer` as the fallback or alternative | `lib/pdf/invoice-template.ts`, `components/pdf/*`, `app/api/pdf`, `app/api/invoices/[id]/*` |
| Maps | Mapbox geocoding (REST) + `mapbox-gl` | `lib/mapbox.ts`, `components/MapboxMap.tsx` |
| Charts | Recharts | `components/analytics/*` |
| Marketing site | Next.js + framer-motion + Magic UI template | `apps/marketing` |
| Tests | Vitest 4 + jsdom + Testing Library (app only) | `apps/app/vitest.config.mjs` |
| Lint | `next lint` (ESLint 8, `next/core-web-vitals` + `next/typescript`) | `packages/eslint-config/next.cjs` |
| CI | GitHub Actions on Node 22: `npm ci`, then lint, then test, then build | `.github/workflows/ci.yml` |
| Hosting | **Vercel**, with two projects (app and marketing). Vercel Analytics + Speed Insights | `apps/app/vercel.json`, `apps/app/src/app/layout.tsx` |

Deployment details:
- `apps/app/vercel.json` gives the two Chromium PDF functions 1024 MB and `maxDuration: 60`. `/api/invoices/[id]/receipt` also launches Chromium but is **not** listed there, so it runs with the default memory and timeout (see risk R-12).
- `apps/app/next.config.ts` marks `puppeteer-core` and `@sparticuz/chromium` as server-external and traces the Chromium binaries into `/api/pdf` and `/api/invoices/[id]/pdf` only.
- `apps/marketing/next.config.ts` redirects `/signup` and `/login` to `NEXT_PUBLIC_MAIN_APP_URL`. In production that is `https://www.indiesuite.app` (per `apps/marketing/.env.example`).
- **Not in the repo:** `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `.firebaserc`. These files have never existed in git history either. Firestore security rules and composite indexes are managed out-of-band, presumably in the Firebase console. That is the most important gap in this audit (see R-01).
- No `middleware.ts`. No security headers or CSP are configured in either `next.config.ts`.
- `apps/app/next.config.js` is a stale, compiled CommonJS copy of `next.config.ts` and is tracked in git. When both files exist, Next.js prefers `next.config.js`. The two currently match, but they will drift apart.
- `apps/app/node_modules/.vite/vitest/.../results.json` is tracked in git (a build artefact).

## 2. Folder structure

```
/                         npm workspace root; root .env.local (not loaded by either app), stray root next/tailwind config
├─ apps/app               the SaaS product (Next.js)
│  └─ src/
│     ├─ app/
│     │  ├─ (app)/        authenticated pages; layout.tsx = AuthGuard + BusinessProvider + sidebar
│     │  │  ├─ dashboard/ overview + notification feed
│     │  │  ├─ analytics/ revenue + bookings charts
│     │  │  ├─ customers/ events/ venues/ invoices/ contracts/   CRUD pages per domain
│     │  │  ├─ settings/  general (account), trading-details (businesses), bank-accounts, subscriptions, billing, contract-template
│     │  │  └─ tutorial/
│     │  ├─ api/          server route handlers (Admin SDK, Stripe, Firma, PDF)
│     │  ├─ login/ signup/ signup/verified/   public auth pages
│     ├─ components/      feature forms (CustomerForm, EventForm, InvoiceForm, ContractForm…), analytics widgets, pdf/, ui/ (shadcn)
│     ├─ hooks/           analytics data hooks, date filter state
│     ├─ lib/
│     │  ├─ firebase/     client SDK init, auth helpers, per-collection CRUD, Admin SDK init
│     │  ├─ firma/        Firma REST client + per-business workspace provisioning
│     │  ├─ stripe/       Stripe server singleton, plan→price mapping, client loader
│     │  ├─ contracts/    contract types and Firestore/Firma payload builders
│     │  ├─ pdf/          Handlebars invoice HTML template
│     │  ├─ filters/      date/time filter logic
│     │  ├─ business-context.tsx   "active business" resolution
│     │  └─ nav.ts, help.tsx, mapbox.ts
│     └─ test/setup.ts
├─ apps/marketing         public landing site (sections/*, lib/config.tsx holds copy/pricing), OG image route, auth redirects
└─ packages/
   ├─ ui                  small shared shadcn primitives (mostly unused; apps keep their own ui/)
   ├─ shared              formatCurrency, cn
   ├─ eslint-config       next + react-library presets
   └─ tsconfig            base / nextjs / react-library
```

## 3. Domains and which files own them

### Auth and accounts
- Client SDK init: `apps/app/src/lib/firebase/client.ts`
- Sign in, sign up, reset, change email or password: `lib/firebase/auth.ts`
- Session state: `lib/firebase/auth-context.tsx` (an `onAuthStateChanged` listener)
- Route protection: `components/auth-guard.tsx`, used in `app/(app)/layout.tsx`. This is **client-side only**: it redirects to `/login` and blocks unverified emails in the UI. No server or middleware gate exists.
- Pages and forms: `app/login`, `app/signup`, `app/signup/verified`, `components/login-form.tsx`, `components/signup-form.tsx`, `components/settings/AccountForm.tsx`, `app/(app)/settings/general`
- Server-side token verification: duplicated inline in every protected route (`authorization: Bearer <idToken>` → `getAdminAuth().verifyIdToken`). **There is no shared helper, and many routes skip the check** (see §6).
- Marketing auth links: `apps/marketing/src/lib/auth-links.ts`, `apps/marketing/src/app/(auth)/*`

### Multi-business ("trading details") tenancy
- A user (`ownerId` = Firebase uid) can own several **businesses**, each a `settings_trading_details` document. Business count limits are defined per plan (Pro 1, Portfolio 3, Agency 10) and enforced **only in the UI**, at `components/team-switcher.tsx:156-157`.
- Active business resolution: `lib/business-context.tsx` (React) and `lib/firebase/user-settings.ts:219` `resolveActiveBusinessIdForUser` (non-React). The resolved ID is stored in `sessionStorage`/`localStorage` and trusted without checking.
- Switcher UI: `components/team-switcher.tsx`, `app/(app)/_components/app-sidebar.tsx`
- Settings: `app/(app)/settings/trading-details`, `components/settings/TradingDetailsForm.tsx`

### CRM: customers and venues
- `lib/firebase/customers.ts`, `components/customers/CustomerForm.tsx`, `app/(app)/customers/{all,create}`
- `lib/firebase/venues.ts`, `components/venues/VenueForm.tsx`, `app/(app)/venues/{all,create}`, Mapbox geocoding in `lib/mapbox.ts`

### Bookings (events)
- `lib/firebase/events.ts`, `components/events/EventForm.tsx`, `app/(app)/events/{all,create,calendar}`
- Analytics: `hooks/use-bookings-analytics-data.ts`, `components/analytics/Bookings*`, `OverviewRadarGigs.tsx`, `OverviewTopCustomers.tsx`

### Invoices and receipts
- Data: `lib/firebase/invoices.ts` (writes from the client, with an invoice-number uniqueness check per owner that runs on the client and is therefore race-prone)
- UI: `components/invoices/InvoiceForm.tsx` (513 lines), `app/(app)/invoices/{all,create,receipts}`
- PDF: `app/api/pdf/route.ts` (POST of the full invoice payload from the browser), `app/api/invoices/[id]/pdf/route.ts` (GET by ID), `app/api/invoices/[id]/receipt/route.ts` (GET by ID, forces `status: "paid"`), `lib/pdf/invoice-template.ts`, `components/pdf/InvoicePdf.tsx`
- "Receipts" are not a separate entity. They are invoices with `status === "paid"`, and the paid date is inferred from `updatedAt` (`invoices/receipts/page.tsx:41-44`). A `receipts` collection name appears only in the backfill helper.
- Analytics: `hooks/use-revenue-analytics-data.ts`, `components/analytics/Revenue*`, `OverviewDonutRevenue*.tsx`

### Contracts and e-signatures
- Types and payload builders: `lib/contracts/{types,firestore-payload,firma-payload,template-options}.ts`
- Client CRUD: `lib/firebase/contracts.ts` (update and delete run straight from the client)
- API: `app/api/contracts/{create,generate,send,list,backfill-owner}/route.ts`
- Firma integration: `lib/firma/server.ts` (REST client), `lib/firma/provisioning.ts` (creates one Firma workspace per business and stores **the workspace API key inside the business Firestore document**)
- Template management: `app/api/firma/templates/{route,create,status,token}`, `app/(app)/contracts/templates/page.tsx`, `components/firma/FirmaTemplateEditor.tsx`, `components/pdf/ContractStarterTemplatePdf.tsx`
- Flow: `contracts/create/page.tsx` loads the event, customer, venue and invoice on the client. It then POSTs to `/api/contracts/generate`, which creates a Firma signing request, and then to `/api/contracts/create`, which saves the Firestore record. `/api/contracts/send` sends the request through Firma.

### Payments and subscriptions (Stripe)
- `lib/stripe/server.ts` (singleton, plan→price mapping, base URL), `lib/stripe/client.ts`
- `app/api/stripe/create-checkout-session`, `create-portal-session`, `get-subscription`, `webhook`
- UI: `app/signup/verified/page.tsx` (starts checkout after signup), `app/(app)/settings/{subscriptions,billing,trading-details}`, `components/team-switcher.tsx`
- **No subscription state is stored.** Every lookup queries Stripe live **by email address**. The webhook verifies the signature and then does nothing (`webhook/route.ts:22-31`). The plan is cached in `localStorage` (`subscriptionPlan`).
- **No paywall.** No route, page or Firestore rule checks for an active subscription. Users who never finish checkout, or who cancel, keep full access. This is high confidence, as no gate appears anywhere in the code.
- Invoices that freelancers send to *their* clients do **not** use Stripe. `payment_link` is a free-text URL the user enters.

### Emails and notifications
- No outbound email code exists. Emails come only from Firebase Auth (`sendEmailVerification`, `sendPasswordResetEmail`) and Firma (signing-request emails, triggered by `/api/contracts/send`).
- `app/(app)/dashboard/_components/notification-feed.tsx` builds a feed on the client from the user's events, invoices and contracts. Nothing is persisted and nothing is pushed.

### Marketing
- `apps/marketing/src/components/sections/*`, `src/lib/config.tsx` (copy, pricing, FAQ, social links that still point to the Magic UI template's accounts), `src/app/og/route.tsx` (edge OG image), `src/app/sitemap.ts`

## 4. Data model (Firestore)

Firestore has no schema. I rebuilt the fields below from the write paths. Every collection is **top-level**, and tenancy is expressed with `ownerId` (+ `businessId`) fields, not subcollections. Isolation therefore depends entirely on Firestore security rules, which are **not in the repo**.

| Collection | Key fields (from write paths) | Relations | Written by | Read by |
|---|---|---|---|---|
| `settings_trading_details` (a "business") | `name, contactName, contactEmail, emails[], phone, building, street, city, area, postcode, country, createdAt, ownerId`, **`firma { workspaceId, workspaceApiKey, contractTemplateId, provisioningStatus, createdAt, updatedAt }`** | owner → user; parent of every other `businessId` | client `user-settings.ts:51`; server `firma/provisioning.ts:36,63,99` | sidebar, team switcher, business context, Firma routes |
| `settings_bank_accounts` | `name, bankName, accountHolder, accountNumberOrIban, sortCodeOrBic, currency, notes, createdAt, ownerId, businessId` | → business | client `user-settings.ts:135` | bank settings, invoice PDF enrichment (client and **unauthenticated server routes**) |
| `customers` | `fullName, fullNameLower, company, email, phone, website, address{building,street,city,area,postcode,country}, preferredContact, notes, createdAt, eventsLinked, totalValue, ownerId, businessId` | → business; referenced by `events.customerId`, `contracts.customerId` | client `customers.ts:32` | customers page, forms, analytics, contract generation |
| `venues` | `name, nameLower, phone, website, address{…}, notes, createdAt, eventsLinked, totalValue, ownerId, businessId` | → business; referenced by `events.venueId` | client `venues.ts:29` | venues page, forms, contracts |
| `events` (bookings) | `title, startsAt (ISO string), endsAt, notes, customerId, venueId, createdAt, ownerId, businessId` | → customer, → venue, → business; referenced by `invoices.eventId`, `contracts.eventId` | client `events.ts:14` | events/calendar, analytics, contracts |
| `invoices` | `invoice_number, issue_date, due_date, user_business_name, user_email, user_contact_name, user_phone, customer_name, customer_contact_name, customer_email, customer_phone, venue_*, line_items[], payments[{name,reference,invoice_number,issue_date,currency,due_date,amount}], notes, payment_link, eventId, status, include_payment_link, include_bank_account, include_notes, bank_account_id, createdAt, updatedAt, ownerId, businessId` | → event (optional), → bank account; customer and venue data is **copied in** (denormalised) | client `invoices.ts:69` (spreads the **entire client input** into the doc) | invoices/receipts pages, analytics, PDF routes |
| `contracts` | `title, titleLower, invoiceId, templateId, body, customerId, eventId, venueId, issueDate, dueDate, notes, status, terms[{text}], recipients[{first_name,last_name,email,designation,order}], firmaId, firmaUrl, businessId, contractData{}, createdAt, ownerId, sentAt` | → event, customer, venue, invoice, business, Firma signing request | server `api/contracts/create`; client `lib/firebase/contracts.ts` (update/delete); server `api/contracts/send` (status) | contracts pages, notification feed |
| `receipts` | (no known writer) | | | referenced only in `backfillBusinessIdForOwner` (`user-settings.ts:199`) |

Outside Firestore:
- **Users** exist only in Firebase Auth. There is no `users` collection.
- **Subscriptions** exist only in Stripe and are linked to the user **by email**, not by uid or a stored customer ID.
- **Firma**: there is one workspace per business, under the company Firma account (`FIRMA_API_KEY`).

Data-model observations:
- `customers.eventsLinked`/`totalValue` and `venues.eventsLinked`/`totalValue` are written as `0` and never updated anywhere.
- Nothing cascades. Deleting a business, customer, venue or event leaves dependent records with dangling IDs (for example `settings/trading-details/page.tsx:138` → `deleteTradingDetails`).
- Updates never touch `ownerId`/`businessId` in the helper functions. But `updateInvoice` spreads `Partial<InvoiceInput>` and `/api/contracts/create` accepts a client-chosen `businessId`, so whether these fields can be rewritten depends on the (unseen) rules.
- Several composite indexes are needed (for example `ownerId + createdAt desc`, `ownerId + businessId + createdAt desc`, `ownerId + fullNameLower`). They aren't in the repo, so index definitions can't be reproduced.

## 5. External services and APIs

| Service | Purpose | Credentials | Code | Notes |
|---|---|---|---|---|
| Firebase Auth | User accounts, email verification, password reset | `NEXT_PUBLIC_FIREBASE_*` | `lib/firebase/client.ts`, `auth.ts` | Email + password only |
| Cloud Firestore | All application data | Client: public config. Server: `FIREBASE_SERVICE_ACCOUNT_JSON` **or** `FIREBASE_PROJECT_ID`/`CLIENT_EMAIL`/`PRIVATE_KEY` | `lib/firebase/*` | Rules and indexes not versioned |
| Firebase Admin | Token verification and server reads/writes that bypass rules | service account | `lib/firebase/admin.ts` | The file header says "no longer used… placeholder", which is wrong: it is used heavily |
| Stripe | SaaS subscriptions (Checkout, Portal) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRICE_PRO[_MONTHLY/_YEARLY]`, `PRICE_PRO_PLUS`, `PRICE_PORTFOLIO_*`, `PRICE_PRO_PLUS_PLUS`, `PRICE_AGENCY_*`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `lib/stripe/*`, `api/stripe/*` | Webhook is a no-op. 30-day trial for "new" emails |
| Firma | E-signature workspaces, templates, signing requests, signing emails | `FIRMA_API_KEY` (company), per-business workspace keys stored in Firestore, plus fallbacks `FIRMA_WORKSPACE_API_KEY`, **`NEXT_PUBLIC_FIRMA_API_KEY`**, `NEXT_PUBLIC_FIRMA_API-KEY`; `FIRMA_DEFAULT_TEMPLATE_ID`/`FIRMA_TEMPLATE_ID` | `lib/firma/server.ts:94-102` | `NEXT_PUBLIC_` vars are inlined into client bundles if any client code references them (see R-08) |
| Chromium (`@sparticuz/chromium`) / Puppeteer | HTML→PDF for invoices and receipts | none | `api/pdf`, `api/invoices/[id]/*` | Falls back to React-PDF if launch fails |
| React-PDF | Fallback invoice PDF; starter contract template PDF | none | `components/pdf/*` | |
| Mapbox | Venue geocoding and map | `NEXT_PUBLIC_MAPBOX_API_KEY` (public token by design) | `lib/mapbox.ts`, `MapboxMap.tsx` | Should be URL-restricted in the Mapbox dashboard |
| Vercel | Hosting, Analytics, Speed Insights | n/a | `layout.tsx`, `vercel.json` | |
| Email provider | none | | | |
| Calendar sync | none | | | |
| File storage | none (bucket configured, unused) | | | |

Env handling:
- Each app has a `.env.example`. `.gitignore` excludes `.env*`, so the examples were force-added. Fine.
- The root `/.env.local` holds a full set of secrets (Stripe secret, Firebase private key, Firma key). Next.js does not load it for either app, so it is a stray copy of production-class secrets on disk. I did not read its values.
- `apps/app/.env.example` doesn't list `FIRMA_DEFAULT_TEMPLATE_ID`, `FIRMA_WORKSPACE_API_KEY` or the `PRICE_*_MONTHLY/YEARLY` variants that the code reads, and it does list `NEXT_PUBLIC_FIRMA_API_KEY`.

## 6. Highest-risk areas (preliminary findings)

These come from Phase 1 reading. Each will be re-verified in its dedicated phase. Severity assumes the app is live with real users.

> **Superseded in part by §7.** Since this table was written, the live Firestore rules have been provided. §7 has the revised severities and two new findings (R-17, R-18). Where the two disagree, §7 is the current rating.

| ID | Severity | Area | Location | Problem | Suggested fix | Confidence |
|---|---|---|---|---|---|---|
| R-01 | **Critical** | Firestore security rules | *(not in repo)*; client data layer `lib/firebase/*.ts`, `contracts/all/page.tsx:64-70`, `components/analytics/BookingsChart.tsx:30` | All tenant isolation depends on rules nobody can review. The client code runs **unfiltered whole-collection reads**: `getDocs(collection(db,"contracts"))` as a fallback and `getDocs(collection(db,"invoices"))`. It also queries `ownerId == null`, and update/delete helpers act on any doc ID. If those reads succeed in production, every user can read every other user's invoices and contracts. The code reads as though they were written against permissive rules. | Export the live rules (`firebase firestore:rules:get` or the console) and commit `firestore.rules` + `firestore.indexes.json`. Require `request.auth.uid == resource.data.ownerId` on read/update/delete and `request.resource.data.ownerId == request.auth.uid` on create, and make `ownerId`/`businessId` immutable. Remove the whole-collection queries. | Unknown until the rules are seen. The code pattern strongly suggests the rules are weak, and this is the single most important item to check |
| R-02 | **Critical** | Invoice PDF/receipt IDOR | `app/api/invoices/[id]/pdf/route.ts:14-38`, `app/api/invoices/[id]/receipt/route.ts:10-20` | No authentication at all. Anyone with (or guessing) an invoice ID gets a PDF with the customer's PII, amounts and, when enabled, **bank account details**, read through the Admin SDK, which bypasses rules. The receipt route also produces a fake "PAID" receipt for any invoice. | Require a Bearer ID token, verify `invoice.ownerId === uid`, and return 404 otherwise. | High |
| R-03 | **Critical** | `/api/pdf` bank-data disclosure | `app/api/pdf/route.ts:15-46` | Unauthenticated. It accepts arbitrary JSON and, with `include_bank_account`, fetches **any** `settings_bank_accounts` doc by ID, or by an attacker-supplied `ownerId`+`businessId`, through the Admin SDK and renders it into a PDF. It is also an unauthenticated, expensive Chromium launch (cost/DoS). | Authenticate the caller. Load the invoice server-side by ID (as in R-02) instead of trusting a client payload, and check ownership of the bank account. Add rate limiting. | High |
| R-04 | **Critical** | Stripe routes keyed by email, no auth | `app/api/stripe/create-portal-session/route.ts:4-24`, `get-subscription/route.ts:4-59`, `create-checkout-session/route.ts:4-47` | No authentication. `create-portal-session` returns a **Billing Portal URL for any email or customer ID supplied**. That lets anyone view or cancel another customer's subscription, change their payment method and read their billing address and invoices. `get-subscription` lets anyone look up a subscription by email (user enumeration). Checkout trusts the body email. | Verify the ID token, use only `decoded.email` (verified) or a Stripe customer ID stored against the uid, and never accept `customerId` from the client. | High |
| R-05 | **High** | Unauthenticated admin backfill | `app/api/contracts/backfill-owner/route.ts:7-21` | Anyone can POST `{ownerId: "<attacker uid>"}` and take ownership of every contract whose `ownerId` is null, through the Admin SDK. | Delete the route, or restrict it to an admin custom claim. | High |
| R-06 | **High** | Missing subscription enforcement / billing state | `app/api/stripe/webhook/route.ts:22-31`; no gate anywhere | The webhook ignores every event, and no code checks plan or status. Access is free indefinitely, and plan limits exist only in the UI (`team-switcher.tsx:156`). Matching customers by email breaks if the email changes. | Persist `stripeCustomerId`/subscription status per uid from the webhook, gate features server-side and in rules, and enforce business limits server-side. | High |
| R-07 | **High** | Firma workspace API keys in a client-readable doc | `lib/firma/provisioning.ts:36-41,63-69` | Each business's Firma `workspaceApiKey` is stored on the `settings_trading_details` doc, which the browser reads directly (`business-context.tsx:45`, `team-switcher.tsx:75`, `app-sidebar.tsx:29`). Any owner can extract their key and call Firma directly, bypassing app limits. With weak rules (R-01), anyone can read everyone's keys. The owner can also **overwrite** `firma.workspaceApiKey`/`contractTemplateId` through client `updateDoc` if the rules allow it. | Move the integration secrets into a server-only collection or Secret Manager that the rules deny to clients. | High (that the key is stored there). Exposure depends on the rules |
| R-08 | **High** | Firma master-key exposure and unauthenticated template list | `lib/firma/server.ts:94-102`, `app/api/firma/templates/route.ts:6-11`, `apps/app/.env.example` | The client falls back to `NEXT_PUBLIC_FIRMA_API_KEY`. `NEXT_PUBLIC_` values are inlined into any client bundle that imports the module and appear in build output and env listings. That makes it a public-by-convention name for a secret. `GET /api/firma/templates` lists the company-level templates **without authentication**. | Remove the `NEXT_PUBLIC_*` fallbacks and rotate the key if it was ever set. Add auth to the templates route, or delete it. | High for the route. Medium for the bundle leak (I haven't confirmed whether a client component imports `lib/firma/server.ts`; to verify in Phase 2) |
| R-09 | **High** | Ownership checks that fail open | `api/contracts/create/route.ts:24`, `generate/route.ts:68`, `send/route.ts:34`, `firma/provisioning.ts:27,82,97` | Checks are written `if (owner && owner !== uid) forbid`. A doc **without** `ownerId` (legacy data, or anything R-05 targets) is treated as accessible to everyone. | Write it as `if (owner !== uid) forbid`. | High |
| R-10 | **High** | Contract generation trusts client data / auth optional | `app/api/contracts/generate/route.ts:48-60,83-89` | If Admin env vars are missing, the route **skips authentication entirely** and builds the contract from client-supplied `data`. Even with Admin configured, a request without `eventId` uses client-supplied event, customer and invoice data, so arbitrary signing requests can be sent through the company Firma account to any email address (spam/phishing under the IndieSuite brand). | Always require auth, always load records server-side, and reject when `hasAdmin` is false. | High |
| R-11 | **Medium** | `contracts/create` and `send` accept client-controlled Firma IDs and businessId | `api/contracts/create/route.ts:15-29`, `send/route.ts:37-45` | A user can save a contract with any `firmaId`/`businessId`. If the business has no integration, `send` falls back to the **company-level** Firma client and calls `send` on that arbitrary signing-request ID. That could trigger another tenant's signing request, if IDs are guessable or leaked. | Validate that `businessId` belongs to the uid, and accept `firmaId` only from the server-side generate step (for example, generate and persist in one server call). | Medium (depends on how Firma scopes workspace and company keys) |
| R-12 | **Medium** | PDF/Chromium robustness | `api/invoices/[id]/receipt/route.ts:22-33`; all PDF routes | The receipt route isn't in `vercel.json` or `outputFileTracingIncludes`, so it likely fails or times out in production (the other routes fall back to React-PDF, this one doesn't). Browsers aren't closed in `finally`, so an exception leaks a Chromium process. `Content-Disposition` uses an unquoted, user-controlled `invoice_number` (header injection / broken filenames). | Share one PDF helper with `try/finally`, register every route, and sanitise and quote the filename. | Medium-high |
| R-13 | **Medium** | Client-trusted business context | `lib/firebase/user-settings.ts:219-234`, `customers.ts:36`, `events.ts:18`, `venues.ts:33` | `activeBusinessId` comes from `session`/`localStorage` and is written into new docs without verifying ownership. Whether this matters depends on the rules (R-01). It can also cross-wire data between a user's own businesses. | Have the rules enforce that `businessId` references a business owned by the requester. | Medium |
| R-14 | **Medium** | Invoice integrity | `lib/firebase/invoices.ts:69-120` | Invoice-number uniqueness is checked on the client (race, bypassable). The entire input object is spread into Firestore, so arbitrary extra fields are accepted. The paid date is inferred from `updatedAt`, so any edit changes it. | Use a transaction or server route with a counter doc, a field allow-list, and an explicit `paidAt`. | High that the issue exists. Medium on impact |
| R-15 | **Low** | Config/env hygiene | `apps/app/next.config.js`, root `.env.local`, root `next/tailwind` leftovers, tracked `node_modules/.vite/...`, `lib/firebase/admin.ts:1-2` | Stale duplicate Next config (the `.js` wins), stray secrets file, misleading comments, tracked artefacts, no security headers or CSP. `.env.example` is out of sync with the vars the code reads. | Delete the stale files, add `headers()` with a CSP/HSTS/frame-ancestors policy, and sync `.env.example`. | High |
| R-16 | **Low** | Data model drift | `customers.ts:52-53`, `venues.ts:46-47`, `trading-details/page.tsx:138` | Counters are never maintained, nothing cascades on delete, and the `receipts` collection is phantom. | Compute the counters on read or maintain them through server triggers. Define the delete semantics. | High |

### Recommended audit order for later phases
1. **Firestore rules + every client-side data path** (R-01, R-07, R-13). Everything else depends on this. I need the live rules from the Firebase console to finish it.
2. **API route authN/authZ**, all 16 app routes (R-02 to R-05, R-08 to R-11).
3. **Billing/subscription lifecycle** (R-04, R-06).
4. **Contracts/Firma integration** end-to-end (R-07, R-10, R-11).
5. **Invoices and PDF generation** (R-12, R-14, rendering correctness, currency/totals).
6. **Client app correctness**: business switching, analytics maths, date/time filters, error handling.
7. **Config, dependencies, CI, test coverage** (R-15; `npm audit`; the tests mock Firebase/Admin and so can't catch rule or auth gaps).
8. Marketing site (low risk: static, aside from the OG route and links).

### Open questions (answered, see §7)
- Live Firestore rules: provided by the owner (reproduced in §7.1).
- `NEXT_PUBLIC_FIRMA_API_KEY` in Vercel: **not set**.
- Production status: **live, but no paying customers, no trials and no marketing yet.**

---

## 7. Addendum: live Firestore rules and revised risk ratings

### 7.1 The rules (as provided; not yet committed to the repo)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthed() { return request.auth != null; }
    match /{collection}/{doc} {
      allow create: if isAuthed() && (
        ( collection in ['customers','venues','events','invoices','receipts','settings_bank_accounts']
          && request.resource.data.ownerId == request.auth.uid
          && request.resource.data.businessId is string )
        || ( collection in ['settings_trading_details']
          && request.resource.data.ownerId == request.auth.uid ) );
      allow read, update, delete: if isAuthed() && resource.data.ownerId == request.auth.uid;
    }
  }
}
```

### 7.2 What the rules get right
- **Reads are isolated per owner.** Firestore rules aren't filters: a query is rejected unless every document it could return passes the rule. So the whole-collection reads I flagged in R-01 **fail with permission-denied** rather than leaking data:
  - `contracts/all/page.tsx:69` (all contracts). The error is caught there.
  - `contracts/all/page.tsx:64` (`ownerId == null`). That error is caught at line 91, so a user with no contracts just sees an empty list.
  - `BookingsChart.tsx:30` (all invoices). This component isn't rendered on any page; only its test imports it.
- **The browser can't create contracts** (`contracts` isn't in the create list). That matches the server-side `/api/contracts/create`.
- Subcollections and unlisted collections are denied by default. Reading a document that doesn't exist is denied.
- **Answer to R-08:** no client component imports `lib/firma/server.ts` (checked with grep), so the `NEXT_PUBLIC_FIRMA_API_KEY` fallback isn't bundled. That key isn't set in Vercel either.

### 7.3 Weaknesses in the rules

| ID | Severity | Location | Problem | Suggested fix | Confidence |
|---|---|---|---|---|---|
| R-01a | **Medium** | rules, `allow … update` | `update` checks only the **existing** `ownerId`. It puts no limits on `request.resource.data`, so an owner can rewrite `ownerId` to another user's uid (planting a fake invoice, customer or contract into a victim's account), change `businessId` to any string, and add any fields (for example `status: "signed"` on a contract, or `firma.*` on a business; see R-17). | Split the rule. For update, require `request.resource.data.ownerId == resource.data.ownerId` and `request.resource.data.businessId == resource.data.businessId`. Allow-list writable fields per collection with `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])`, and deny `firma` on `settings_trading_details`. | High |
| R-01b | **Medium** | rules, `allow create` | `businessId is string` doesn't check that the business belongs to the creator. Combined with R-13, records can point at any business ID. | `exists(/databases/$(database)/documents/settings_trading_details/$(request.resource.data.businessId)) && get(...).data.ownerId == request.auth.uid` | High |
| R-01c | **Medium** | rules, `settings_trading_details` read | The owner can read the `firma.workspaceApiKey` secret, because rules work per document, not per field (see R-07). | Move the Firma integration into a separate collection such as `integrations_firma/{businessId}` with `allow read, write: if false` (Admin SDK only). | High |
| R-01d | **Low** | rules (all) | No `request.auth.token.email_verified` check, so an unverified account gets full data access through the SDK. The email-verification gate exists only in `AuthGuard`. | Add `&& request.auth.token.email_verified == true` to `isAuthed()`. | High |
| R-01e | **Low** | rules (all) | No limits on field types or document sizes, and no rate limiting. A user can create unlimited documents (cost, abuse). | Validate types on create and update. Consider App Check. | High |
| R-01f | **Low** | repo | The rules and indexes still aren't versioned, so they can't be reviewed, tested or rolled back. | Commit `firestore.rules`, `firestore.indexes.json` and `firebase.json`, and add `@firebase/rules-unit-testing` tests to CI. | High |

### 7.4 New findings

| ID | Severity | Location | Problem | Suggested fix | Confidence |
|---|---|---|---|---|---|
| **R-17** | **Critical** (inherent). Current exposure is low because no other real tenants use contracts yet | `lib/firma/provisioning.ts:47-55`, `:123-127`; reachable through `GET /api/firma/templates/status` (`status/route.ts:17`), `templates/create`, `contracts/generate` | **Firma workspace takeover by business name.** When a business has no Firma integration yet, the server searches **all** company workspaces for the name `"${business.name} Workspace"` (`findWorkspaceByName`). It attaches the first match, fetches that workspace's **API key using the company key**, and writes it into the caller's business document, which the caller can then read (R-01c). An attacker who creates a business with the same trading name as a victim (trading names are public and printed on invoices) gets the victim's Firma workspace key. With it they can read the victim's contracts and customer details and send signing requests in the victim's name. This can also happen **by accident** when two real users share a business name. | Never reuse a workspace by name. Create a new workspace per business, named or tagged with the immutable `businessId`, and store the mapping in a server-only collection. Audit any existing workspace mappings for duplicates. | Medium-high. The logic is clear in the code. It assumes Firma's `GET /workspaces/{id}` returns `api_key` for the company key, which the code itself relies on (`provisioning.ts:54-55`) |
| **R-17b** | **High** | `lib/firma/provisioning.ts:30-41`, with rules R-01a | **The same takeover by workspace ID.** Because the owner can write `firma.*` through the client SDK (R-01a), they can set `firma.workspaceId` to another tenant's workspace ID and delete `workspaceApiKey`. The next server call fetches that workspace's key with the company key and stores it in the attacker's document. This needs the victim's workspace ID (it isn't exposed to other tenants as far as I can see, so harder than R-17). | Same fix as R-17, plus deny client writes to `firma`. | Medium-high |
| R-18 | **Low** | `app/(app)/contracts/all/page.tsx:62-71` | The client fallback queries (`ownerId == null`, then the whole collection) always fail under these rules. They're dead code that adds a failing request each time a user with no contracts loads the page, and they imply an intent to show unowned contracts to everyone. | Remove the fallback and rely on `/api/contracts/list`. | High |

### 7.5 Revised ratings for Phase 1 risks

"Inherent" is the severity once real paying tenants exist. "Now" reflects the current state: live, no paying customers, no trials.

| ID | Was | Inherent | Now | Reason for change |
|---|---|---|---|---|
| R-01 | Critical | **Medium** (split into R-01a to R-01f) | Medium | The rules do isolate reads and deletes per owner. What's left is weak write validation |
| R-02 | Critical | **High** | High | Invoice IDs are random Firestore auto-IDs (around 120 bits), so they can't be enumerated. Exploiting this needs a leaked ID, for example from the shareable `/api/invoices/{id}/receipt` URL opened in a new tab (`receipts/page.tsx:94`), browser history or logs. Still unauthenticated disclosure of bank details and PII |
| R-03 | Critical | **High** | High | Same reason as R-02: it needs a bank-account ID, or a uid + businessId. The uid appears in a query string (`contracts/all/page.tsx:51` → request logs). It's still an unauthenticated route that launches Chromium on every call |
| R-04 | Critical | **Critical** | Low | Billing-portal hijack works with nothing more than an email address. Right now there are no real Stripe customers, so nothing is exposed, but it must be fixed **before any paid signups** |
| R-05 | High | High | High | Unaffected by the rules (it uses the Admin SDK) |
| R-06 | High | High | Low | No paywall. That doesn't matter until you charge, but it blocks launch |
| R-07 | High | High (see R-01c, R-17) | High | The rules confirm the owner can read and write the key. Cross-tenant exposure comes through R-17, not through the rules |
| R-08 | High | **Medium** | Medium | The `NEXT_PUBLIC_` key isn't set and isn't bundled. The unauthenticated `GET /api/firma/templates` still lists company-level templates using the company key |
| R-09 | High | High | Medium | The rules don't apply to Admin routes. Mostly affects legacy contracts with no `ownerId` |
| R-10 | High | High | High | It lets anyone with an account send arbitrary signing emails through your Firma account and domain reputation |
| R-11 | Medium | Medium | Medium | Made easier by R-01a, since the client can rewrite `firmaId` on its own contracts |
| R-13 | Medium | Medium (see R-01b) | Low | Mostly mixes up data between a user's own businesses |
| R-12, R-14, R-15, R-16 | unchanged | | | |

### 7.6 Priority list before any marketing or paid launch
1. R-17 / R-17b: Firma workspace mapping, plus moving the Firma secrets out of client-readable documents.
2. R-02, R-03, R-05, R-10: add authentication and ownership checks to every API route (a shared `requireUser(req)` helper).
3. R-04, R-06: authenticate the Stripe routes, link the Stripe customer to the uid, implement the webhook and a server-side gate.
4. R-01a/b/d: tighten update and create validation in the rules, and commit the rules with tests.
