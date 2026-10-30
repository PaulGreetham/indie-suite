# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Audit and fix progress is tracked in audit/STATUS.md. Read it before starting any security or audit work, and update it after every fix.

## Security conventions

Follow these in every change:

- **API routes** authenticate with `requireUser`, or `requireActiveUser` for product features, from `lib/server/auth.ts`. They load every referenced document with `loadOwned`/`loadOwnedOrNull` and return errors through `handleRouteError`, never raw upstream messages. Documented exceptions:
  - the Stripe webhook (signature check)
  - cron and admin routes (`requireSecret`)
  - billing routes a user needs in order to subscribe (`requireUser`, not `requireActiveUser`)
- **Never trust client-supplied data for anything server-built.** That covers invoices, contracts, businesses and billing. Never look up Stripe by email, only by the `stripeCustomerId` in `billing/{uid}`.
- **Rate limiting:** routes that cost money or CPU (Chromium, Firma, Stripe, bulk writes) call `rateLimit(uid, bucket)`.
- **Firestore rules** live in `firestore.rules`. Every rule or client-payload change needs matching tests in `apps/app/firestore-tests/`. Build payloads with `stripUndefined`. Publish rules only after the app that depends on them is deployed.
- **Secrets** never use a `NEXT_PUBLIC_` name. Server-only data goes in collections the rules deny to clients (`billing`, `integrations_firma`, `stripe_events`, `invoice_numbers`, `firma_workspace_cleanup`).
- **New third-party origins** must be added to the CSP in the relevant `next.config.ts` before use.
- **`puppeteer-core` and `@sparticuz/chromium`** are upgraded together, to versions that target the same Chrome major.
- **Before committing:** `npm run lint`, `npm run test`, `npm run test:rules -w app` (needs Java) and `npm run build`. CI runs the same steps plus `npm audit --omit=dev --audit-level=critical`.

## Overview

IndieSuite is a gig/freelance admin SaaS (events, venues, customers, invoices, contracts, analytics) for independent performers. It is an npm-workspaces monorepo (no Turbo/pnpm) with two Next.js 15 / React 19 / Tailwind v4 apps:

- `apps/app` is the authenticated product (Firebase Auth + Firestore, Stripe, Firma e-signatures, PDF generation)
- `apps/marketing` is the public landing site. Its `/signup` and `/login` redirect to `NEXT_PUBLIC_MAIN_APP_URL` (see `next.config.ts`)

Shared packages are consumed as TypeScript source with no build step. Both apps list them in `transpilePackages`:
- `@indie-suite/ui`: shared shadcn-style primitives (button, card, input, label, theme-provider, cn)
- `@indie-suite/shared`: small utilities (`formatCurrency`, `cn`)
- `@indie-suite/eslint-config`, `@indie-suite/tsconfig`: shared configs

Each app also keeps its own `src/components/ui` (shadcn), and most UI comes from there rather than from `@indie-suite/ui`.

## Commands

Run these from the repo root:

```bash
npm run dev:app            # product app
npm run dev:marketing      # marketing site
npm run lint               # next lint for both apps
npm run test               # vitest run (app only; marketing has no tests)
npm run build              # builds marketing then app
npm run test:rules -w app  # Firestore rules tests against the emulator (needs Java 11+)
```

Single test or watch mode (app):

```bash
npm run test -w app -- src/lib/stripe/__tests__/some.test.ts
npm run test -w app -- -t "test name pattern"
npm run test:watch -w app
```

CI (`.github/workflows/ci.yml`, Node 22) runs two jobs on pushes to main and on PRs, and every step must pass. `verify` runs `npm ci`, `npm audit --omit=dev --audit-level=critical`, `lint`, `test` and `build`. `rules` runs the Firestore rules tests against the emulator (`firebase.json`, project `demo-indie-suite`). Dependabot opens weekly update PRs.

Vitest uses jsdom with `@testing-library/react`. The setup file is `apps/app/src/test/setup.ts`, and the `@/` paths come from the tsconfig via `vite-tsconfig-paths`. Tests live in `__tests__/` folders next to the code they test and match `src/**/*.{test,spec}.{ts,tsx}`.

## App architecture (`apps/app`)

**Routing.** All authenticated pages are under `src/app/(app)/`. `(app)/layout.tsx` is a client component that wraps everything in `AuthGuard` (a client-side redirect to `/login`), `PlanGuard` (sends users without an active, trialing or past_due plan to `/subscribe`) and `BusinessProvider`. It also builds breadcrumbs and per-page help popovers from `src/lib/nav.ts` (`navMain`) and `src/lib/help.tsx` (`helpByPath`). When you add a page, register it in `nav.ts` and add an entry to `help.tsx` if it needs help text. There is no Next middleware. The client guards are for UX only: the real enforcement is the Firestore rules and the API routes.

**Data access.** Customers, venues, events, bank accounts and trading-details updates are written directly from the browser by `src/lib/firebase/*.ts`. Businesses, invoices and contracts are created and updated only through server routes (`/api/businesses`, `/api/invoices`, `/api/contracts/generate`). Records are scoped by `ownerId` (the Firebase uid) and by `businessId`.
- `firestore.rules` gives each collection its own block, with an exact create field allow-list, update allow-lists, immutable `ownerId`/`businessId`/`createdAt`, owned-reference checks, a verified email and a live plan. If you change a client payload, update the rules and `apps/app/firestore-tests/` together. Unlisted collections are denied.
- Server-only collections (no client access): `billing`, `stripe_events`, `integrations_firma`, `invoice_numbers`, `firma_workspace_cleanup`.
- Build write payloads with `stripUndefined` (`lib/strip-undefined.ts`). It keeps `serverTimestamp()` sentinels intact, which the rules check (`createdAt == request.time`).
- A "business" is a `settings_trading_details` doc. `src/lib/business-context.tsx` resolves the active business in this order: in-memory state, then `sessionStorage` (checked with `isOwnBusiness`), then the newest trading-details doc for the user. It throws `BUSINESS_REQUIRED` if none exists. `signOutUser` clears the per-user storage keys.
- Errors are thrown as string codes such as `AUTH_REQUIRED` and `BUSINESS_REQUIRED`. The shared forms show them through `saveErrorMessage` (`lib/errors.ts`).

**Server API routes** (`src/app/api/**/route.ts`) use the Firebase Admin SDK (`lib/firebase/admin.ts`, `getAdminDb` / `getAdminAuth`). Authenticated routes expect `Authorization: Bearer <Firebase ID token>` and use the helpers in `lib/server/auth.ts`. `requireUser` checks the token, revocation and a verified email. `requireActiveUser` also requires a live plan (402 otherwise). `loadOwned`/`loadOwnedOrNull` return 404 unless `ownerId` matches. `handleRouteError` returns generic error codes. Routes that cost money call `rateLimit(uid, bucket)` (`lib/server/rate-limit.ts`, Upstash; off without env vars). Admin credentials come from `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`, or from `FIREBASE_SERVICE_ACCOUNT_JSON`.

**Integrations:**
- **Stripe** (`lib/stripe/`, `api/stripe/*`): Stripe is linked to the uid through the server-only `billing/{uid}` doc and never looked up by email.
  - `start-trial` creates a card-free 90-day trial at signup.
  - Checkout, the customer portal and `get-subscription` require auth.
  - The webhook mirrors subscription state into `billing/{uid}`, made idempotent by `stripe_events`.
  - Plans are Pro, Portfolio and Agency (`pro`, `pro+`, `pro++`). They differ only in business limits (1, 3, 10), which `/api/businesses` enforces.
- **Firma** e-signatures (`lib/firma/server.ts`, `lib/firma/provisioning.ts`, `api/firma/templates/*`, `api/contracts/*`): Each business gets its own Firma workspace, stored server-only in `integrations_firma/{businessId}`. Workspaces are never matched by name, and are created only by `templates/create`. Contracts are generated from templates and sent for signing. Firestore and Firma payload builders live in `lib/contracts/` (`firestore-payload.ts`, `firma-payload.ts`).
- **PDF**: `api/invoices/[id]/pdf` and `api/invoices/[id]/receipt` render invoices through `lib/pdf/render.ts`, loading data server-side with ownership checks. The default engine is HTML (`lib/pdf/invoice-template.ts`, Handlebars-style) rendered by `puppeteer-core` + `@sparticuz/chromium`. React-PDF (`components/pdf/InvoicePdf.tsx`) is the alternative, selected with `?engine=react` or `PDF_ENGINE=react`. These routes need `runtime = "nodejs"`, the `serverExternalPackages` / `outputFileTracingIncludes` settings in `next.config.ts`, and the memory and duration settings in `vercel.json`. Keep all three in sync if you add a PDF route.
- **Mapbox** (`lib/mapbox.ts`, `components/MapboxMap.tsx`) is used for venues.

`apps/app/next.config.ts` is the only Next config. Don't add a compiled `next.config.js`: Next loads `.js` in preference and silently ignores its `exports.default` settings.

Both `next.config.ts` files send security headers and an enforced Content Security Policy. Add any new third-party origin to the CSP before using it. The app defaults to dark theme (`next-themes`) and deploys to Vercel with Vercel Analytics and Speed Insights.

## Marketing (`apps/marketing`)

The site is built from the Magic UI SaaS template. The landing page is assembled from `src/components/sections/*`, and the copy, pricing, FAQ and links live in `src/lib/config.tsx` (`siteConfig`). Animations use `framer-motion` and the components in `src/components/magicui`.

## Environment

Next.js reads each app's own `apps/<app>/.env.local`, and each app has a `.env.example` listing its variables. Don't create a `.env.local` at the repo root: Next.js never loads it. `apps/app/.env.example` documents every variable the app reads. That includes the optional `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (App Check) and `UPSTASH_REDIS_REST_URL`/`TOKEN` (rate limiting), which leave their feature off while empty.
