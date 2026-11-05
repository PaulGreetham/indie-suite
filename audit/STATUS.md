# Audit and fix status

Single source of truth for security-audit progress. Read this before starting any security or audit work, and update it after every fix.

- Detailed findings: [00-architecture.md](00-architecture.md) (Phase 1, `R-*`), [02-security.md](02-security.md) (Phase 2, `S-*`) and [03-signup-flow.md](03-signup-flow.md) (sign-up flow, `SU-*`).
- Last updated: 2026-11-04. Fixes 1–42 are written and 1–41 are merged (fix 41 = PR #76, sign-up audit SU-01 to SU-12). Fix 42 (PR #77, `fix/verification-email-domain`) is awaiting merge. The sign-up flow was tested end to end in production on 2026-11-03: new account → verification email with Continue → plan picker → Checkout → dashboard.

## Findings

Severity is the inherent rating (once paying tenants exist). Status: **Fixed**, **Partial**, **Not started** or **Won't fix**.

| ID | Title | Severity | Status | Fixed in | Write-up |
|---|---|---|---|---|---|
| R-01 | Firestore security rules (umbrella, split into R-01a–f) | Critical → Medium | Fixed | `5ef8b39`, `78d6a3c`, `a91fe98`, `715f963` | [00 §6](00-architecture.md#6-highest-risk-areas-preliminary-findings), [00 §7.3](00-architecture.md#73-weaknesses-in-the-rules) |
| R-01a | Rules: update can rewrite ownerId/businessId and add any field | Medium | Fixed | `a91fe98`, `715f963` | [00 §7.3](00-architecture.md#73-weaknesses-in-the-rules) |
| R-01b | Rules: create doesn't check the business belongs to the caller | Medium | Fixed | `a91fe98` | [00 §7.3](00-architecture.md#73-weaknesses-in-the-rules) |
| R-01c | Rules: owner can read the Firma workspace API key | Medium | Fixed | `a47d219` | [00 §7.3](00-architecture.md#73-weaknesses-in-the-rules) |
| R-01d | Rules: no `email_verified` check | Low | Fixed | `a91fe98` | [00 §7.3](00-architecture.md#73-weaknesses-in-the-rules) |
| R-01e | Rules: no type/size limits, no rate limiting | Low | Partial | `a91fe98`, `715f963` (types/sizes). Client create volume is only limited once App Check is enforced | [00 §7.3](00-architecture.md#73-weaknesses-in-the-rules) |
| R-01f | Rules and indexes not versioned or tested | Low | Fixed | `5ef8b39`, `78d6a3c` | [00 §7.3](00-architecture.md#73-weaknesses-in-the-rules) |
| R-02 | Invoice PDF/receipt IDOR | High | Fixed | `692df31`, `543f360`, `429242a` | [00 §6](00-architecture.md#6-highest-risk-areas-preliminary-findings) |
| R-03 | `/api/pdf` bank-data disclosure | High | Fixed | `429242a` (route removed) | [00 §6](00-architecture.md#6-highest-risk-areas-preliminary-findings) |
| R-04 | Stripe routes keyed by email, no auth | Critical | Fixed | `c7e313f`, `9505a71` | [00 §6](00-architecture.md#6-highest-risk-areas-preliminary-findings) |
| R-05 | Unauthenticated admin backfill route | High | Fixed | `692df31` | [00 §6](00-architecture.md#6-highest-risk-areas-preliminary-findings) |
| R-06 | No subscription enforcement / billing state | High | Fixed | `92e4b1e`, `1e842f3`, `c4aee7a`, `3339e1f` | [00 §6](00-architecture.md#6-highest-risk-areas-preliminary-findings) |
| R-07 | Firma workspace keys in a client-readable doc | High | Fixed | `a47d219` | [00 §6](00-architecture.md#6-highest-risk-areas-preliminary-findings) |
| R-08 | Firma `NEXT_PUBLIC_` key fallback, unauthenticated template list | Medium | Fixed | `692df31`, `980ae11` | [00 §6](00-architecture.md#6-highest-risk-areas-preliminary-findings) |
| R-09 | Ownership checks that fail open | High | Fixed | `dc8b1bb`, `42342d6`, `41a76b3` | [00 §6](00-architecture.md#6-highest-risk-areas-preliminary-findings) |
| R-10 | Contract generation trusts client data / optional auth | High | Fixed | `cbc670d` | [00 §6](00-architecture.md#6-highest-risk-areas-preliminary-findings) |
| R-11 | Client-controlled Firma IDs / businessId on contracts | Medium | Fixed | `b1bb5a2` | [00 §6](00-architecture.md#6-highest-risk-areas-preliminary-findings) |
| R-12 | PDF/Chromium robustness | Medium | Fixed | `543f360`, `429242a`, `747fbc0`, `32db5b4` | [00 §6](00-architecture.md#6-highest-risk-areas-preliminary-findings) |
| R-13 | Client-trusted business context | Medium | Fixed | `a91fe98`, `1f398c6` | [00 §6](00-architecture.md#6-highest-risk-areas-preliminary-findings) |
| R-14 | Invoice integrity (numbering race, field allow-list, paid date) | Medium | Fixed | `fde284d` | [00 §6](00-architecture.md#6-highest-risk-areas-preliminary-findings) |
| R-15 | Config/env hygiene, no security headers | Low | Fixed | `747fbc0`, `7d9b7b0`, `dbe7155`, `9caaf8d` | [00 §6](00-architecture.md#6-highest-risk-areas-preliminary-findings) |
| R-16 | Data model drift (counters, no delete cascade, phantom `receipts`) | Low | Partial | `6676643` (business delete), `715f963` (`receipts` denied). `eventsLinked`/`totalValue` still not maintained | [00 §6](00-architecture.md#6-highest-risk-areas-preliminary-findings) |
| R-17 | Firma workspace takeover by business name | Critical | Fixed | `8332bbb`, `a47d219` | [00 §7.4](00-architecture.md#74-new-findings) |
| R-17b | Firma workspace takeover by workspace ID | High | Fixed | `a47d219` | [00 §7.4](00-architecture.md#74-new-findings) |
| R-18 | Dead fallback queries on the contracts list | Low | Fixed | `193e0ac` | [00 §7.4](00-architecture.md#74-new-findings) |
| S-01 | Cross-tenant reads through user-controlled references | High | Fixed | `cbc670d`, `429242a`, `715f963` | [02 §4](02-security.md#4-new-findings) |
| S-02 | Stripe identity is the email address | Critical | Fixed | `c7e313f`, `9505a71`, `92e4b1e`, `0b887e5` | [02 §4](02-security.md#4-new-findings) |
| S-03 | Unbounded Firma workspace creation | Medium | Fixed | `f1ab134`, `3339e1f`, `edd6717`, `6676643` | [02 §4](02-security.md#4-new-findings) |
| S-04 | Vulnerable dependencies | High | Partial | `805175d`, `fc0e15a`, `e8c6060`, `6544696`, `e0bb153` (jose override; `6544696` broke every API route on Vercel). 9 non-reachable advisories remain (see next fixes) | [02 §4](02-security.md#4-new-findings) |
| S-05 | Third-party script without SRI or CSP | Medium | Fixed | `7d9b7b0`, `dbe7155` (Firma publishes no SRI hashes) | [02 §4](02-security.md#4-new-findings) |
| S-06 | Raw upstream errors returned to the browser; uid in URLs | Low | Fixed | `dc8b1bb`, `6fd065d` and the WS-2 route commits | [02 §4](02-security.md#4-new-findings) |
| S-07 | Storage not cleared on sign-out | Low | Fixed | `1f398c6` | [02 §4](02-security.md#4-new-findings) |
| S-08 | No `email_verified`/revocation checks; PDF links without tokens | Low | Fixed | `dc8b1bb`, `543f360`, `429242a` | [02 §4](02-security.md#4-new-findings) |
| S-09 | Privacy: policy/terms, deletion, export, retention | Medium | Partial | `577aa26` (retention + erasure). Policy/terms, data export and DPAs not started | [02 §4](02-security.md#4-new-findings) |
| S-10 | OG route spoofing; template upload checks | Low | Fixed | `edd6717` | [02 §4](02-security.md#4-new-findings) |
| S-11 | Venue map popup rendered the venue name and address as HTML (`setHTML`), so a crafted name ran script in the app origin when its map opened. Venues are owner-scoped, so only self-XSS today | Medium | Fixed | `5287cb7` (UI-F05): popup built from DOM text nodes (`setDOMContent`), test in `components/__tests__/MapboxMap.test.tsx` | [ui-audit/01 appendix](../ui-audit/01-inventory.md#appendix-defects-spotted-during-the-inventory) (INV-A4) |
| SU-01 | Stripe webhook pointed at the marketing domain and was disabled | Critical | Fixed | Endpoint `we_1SGGEoInpCKGtwvRk6udlfVe` now targets `https://app.indiesuite.app/api/stripe/webhook`, re-enabled, signing secret matched in Vercel; delivery verified 2026-11-03. `51899f3` (self-heal backstop) | [03 §2](03-signup-flow.md#2-findings) |
| SU-02 | No yearly price IDs in production | High | Fixed | `PRICE_PRO_YEARLY`, `PRICE_PORTFOLIO_YEARLY`, `PRICE_AGENCY_YEARLY` set in Vercel Production (2026-11-03, live since #76) | [03 §2](03-signup-flow.md#2-findings) |
| SU-03 | Plan picked implicitly before Checkout | High | Fixed | `8d2a2fc` | [03 §2](03-signup-flow.md#2-findings) |
| SU-04 | Duplicate subscriptions for one account | High | Fixed | `af34a83` | [03 §2](03-signup-flow.md#2-findings) |
| SU-05 | Stale ID token locks out newly verified users | Medium | Fixed | `99bf6b2` | [03 §2](03-signup-flow.md#2-findings) |
| SU-06 | Verification email has no way back to the app | Medium | Fixed | `94637da`; fix 42 (`fix/verification-email-domain`): `94637da` sent no email at all while `app.indiesuite.app` wasn't an authorised Firebase domain. Needs `app.indiesuite.app` in Firebase Auth → Settings → Authorized domains | [03 §2](03-signup-flow.md#2-findings) |
| SU-07 | Failed plan check reads as "you need to pay" | Medium | Fixed | `27d20ad` | [03 §2](03-signup-flow.md#2-findings) |
| SU-08 | Checkout and statements say "Vertechx Collective" | Medium | Not started | Stripe dashboard setting | [03 §2](03-signup-flow.md#2-findings) |
| SU-09 | No rate limiting or bot check on sign-up in production | Medium | Not started | Upstash account + Vercel env; App Check enforcement in Firebase console | [03 §2](03-signup-flow.md#2-findings) |
| SU-10 | "Full name" discarded | Low | Fixed | `dcd5edb` | [03 §2](03-signup-flow.md#2-findings) |
| SU-11 | Welcome dialog per browser, not per account | Low | Fixed | `89bde09` | [03 §2](03-signup-flow.md#2-findings) |
| SU-12 | `/signup/verified` reads the session too early; no log-in link | Low | Fixed | `40eb348` | [03 §2](03-signup-flow.md#2-findings) |
| SU-13 | One trial per account, not per card | Low | Won't fix (for now) | Product decision: needs card fingerprints stored | [03 §2](03-signup-flow.md#2-findings) |

## Remaining fixes (priority order)

1. **NEXT → Merge PR #77 (fix 42, `fix/verification-email-domain`).** #76 sent no verification email while `app.indiesuite.app` wasn't an authorised Firebase domain (the domain has since been added, so production works). #77 only adds the Continue link on `NEXT_PUBLIC_SITE_URL`'s origin, so a missing domain (e.g. Vercel previews) still gets the plain email.
2. **Stripe branding (SU-08):** Settings → Public details: business name "IndieSuite", statement descriptor, and Branding (logo, colours).
3. **Set `CRON_SECRET` and `ADMIN_API_SECRET` in Vercel (fix 38, S-09, merged).** Until the secrets are set, the retention cron and erase route refuse every call.
   - Also set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (SU-09): rate limiting is off in production until they exist. Consider enforcing App Check for Firebase Auth in the console.
4. **Privacy policy and terms (S-09).** Separate workload owned by the user: list processors (Google Cloud/Firebase, Vercel, Stripe, Firma, Mapbox, Upstash), Firestore region `europe-west4`, retention periods (below) and the erasure route. Needs the legal entity and a lawyer review.
5. **Data export (S-09, right to portability).** A "Download my data" ZIP (JSON + CSV). Deferred by the user.
6. **Remaining dependency advisories (S-04).** Then raise the CI audit gate from `critical` to `high`.
   - `firebase` client SDK 13 (gRPC advisory in its Node build; together with `@firebase/rules-unit-testing` 6)
   - Next 16 (bundled `postcss`/`picomatch`, build-time only)
   - `puppeteer-core` beyond 25.11 once `@sparticuz/chromium` ships Chrome 154+ (zod in `chromium-bidi`)
7. **R-16 counters.** `customers.eventsLinked` / `totalValue` and `venues.*` are never maintained. Compute them on read or maintain them server-side. Not security.
8. **Optional hardening.**
   - Verify App Check tokens on API routes as well.
   - `stripe_events` grows forever (a few docs per sign-up and per subscription change). Add an `expireAt` field and a Firestore TTL policy (e.g. 30 days); the docs are only needed to drop Stripe's duplicate deliveries.
   - SU-13 (one trial per card, not per account) is an open product decision: it would need card fingerprints stored server-side.
   - Replace the two "business limit reached" dialogs' localStorage plan label with the server value. This is cosmetic, because the server enforces the limit.

## Decisions

- **`requireUser` defaults to `verifiedEmail: true`.** No route needs to work before verification. `/signup/verified` refreshes the ID token (`getIdToken(true)`) after `reload()` so the claim is current.
- **Firestore rules live in `firestore.rules`** with emulator tests in `apps/app/firestore-tests/`. They are published by pasting into the Firebase console (`firebase.json` is emulator-only). When a change moves client writes to the server, deploy the app first, then publish the rules.
- **The database was wiped twice** (no real customers), so rules and code don't carry legacy-data compatibility.
- **Server-written collections:** businesses (`/api/businesses`), invoices (`/api/invoices`) and contracts (`/api/contracts/generate`). Clients can't create or delete them.
- **Server-only collections:** `billing`, `stripe_events`, `integrations_firma`, `invoice_numbers` and `firma_workspace_cleanup`.
- **Billing is linked to the Firebase uid** via `billing/{uid}`, never by email (S-02).
- **Plans:** Pro, Portfolio and Agency (`pro`, `pro+`, `pro++`) offer the same features and differ only in business count (1/3/10, enforced server-side). Firma usage is unlimited.
- **Trial:** 90 days, card required, one per uid. Flow: sign up → verify email → `/subscribe` plan picker (preselected from the marketing link) → Stripe Checkout (`create-checkout-session`, `payment_method_collection: "always"`) → app. Stripe charges the card when the trial ends. The card-free `start-trial` route was removed (fix 40). Access is granted from `billing/{uid}`, written by the webhook and, as a backstop, by `get-subscription` when Stripe shows a live subscription the webhook missed.
- **No live plan (active/trialing/past_due) means no access.** This is enforced by PlanGuard (UX), `requireActiveUser` (402) and the rules.
- **Closing an account** uses the existing "Cancel in Stripe" button (portal, cancels at period end). Data is kept, and resubscribing reinstates the account.
- **Retention:**
  - Closed accounts are erased 12 months after `endedAt`.
  - Unverified sign-ups are erased after 30 days.
  - Verified sign-ups that never subscribed are erased after 12 months.
  - On-request erasure goes through `POST /api/admin/erase-user`.
- **A business can't be deleted while it has invoices** (they may be tax records). Otherwise its records are deleted with it.
- **Firma:**
  - One workspace per business, never matched by name.
  - Firma has no workspace delete API, so deleted workspaces are queued in `firma_workspace_cleanup` for manual removal.
  - The env `FIRMA_API_KEY` is always the company key.
- **Rate limiting** uses Upstash with per-user per-minute and per-day buckets. It fails open on Redis errors and is off while its env vars are unset.
- **CSP is enforced.** New third-party origins must be added first.
- **`puppeteer-core` is pinned** to the release that matches `@sparticuz/chromium`'s Chrome major (25.11.0 ↔ 153). Dependabot ignores both.
- **The CI audit gate stays at `critical`** until the item 4 upgrades land.

## Manual tasks (outside the code)

- [ ] **Firebase:** publish the current `firestore.rules` if it hasn't been published since #72 (business deletion).
- [x] **Firebase Auth authorised domains:** `app.indiesuite.app` added (needed for the verification email's Continue link).
- [ ] **Firebase App Check:**
  - [x] Fraud Defense (reCAPTCHA Enterprise) is registered.
  - [ ] Register local debug tokens.
  - [ ] Watch Metrics, then enforce Firestore and then Authentication.
- [ ] **Google Cloud:** restrict the Firebase browser API key to `app.indiesuite.app`, `*.vercel.app` and `localhost`.
- [ ] **Mapbox:** restrict the token to the same URLs.
- [ ] **Vercel (`indie-suite-app`, Production):**
  - [x] `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (Config)
  - [x] `NEXT_PUBLIC_SITE_URL=https://app.indiesuite.app` (Stripe return URLs, verification email Continue link)
  - [x] `PRICE_PRO_YEARLY`, `PRICE_PORTFOLIO_YEARLY`, `PRICE_AGENCY_YEARLY` (monthly uses the legacy `PRICE_PRO`, `PRICE_PRO_PLUS`, `PRICE_PRO_PLUS_PLUS`)
  - [ ] `UPSTASH_REDIS_REST_URL` (Config) and `UPSTASH_REDIS_REST_TOKEN` (Secret)
  - [ ] `CRON_SECRET` and `ADMIN_API_SECRET` (Secrets, `openssl rand -hex 32`)
  - [ ] Delete `FIRMA_WORKSPACE_API_KEY` (no longer read)
  - [ ] Confirm the build uses Node 22.x
- [ ] **Stripe:**
  - [x] Webhook endpoint `https://app.indiesuite.app/api/stripe/webhook` (`we_1SGGEoInpCKGtwvRk6udlfVe`) with `checkout.session.completed` and `customer.subscription.*`; `STRIPE_WEBHOOK_SECRET` matches (verified 2026-11-03).
  - [ ] Public business name and branding (SU-08): Checkout and statements still say "Vertechx Collective".
  - [ ] Customer portal allows payment-method updates; trial-ending reminder emails are on.
  - [ ] One test-mode run on Stripe SDK 23: trial, end trial, checkout, portal.
- [ ] **Firma:**
  - [ ] Delete old test workspaces (e.g. "Big Test Band Workspace").
  - [ ] Periodically process the `firma_workspace_cleanup` queue in the Firma dashboard.
- [ ] **GitHub:** enable Dependabot alerts and security updates (Settings → Code security).
- [ ] **Legal:** accept or sign DPAs with Google Cloud/Firebase, Stripe, Vercel, Firma, Mapbox and Upstash.
