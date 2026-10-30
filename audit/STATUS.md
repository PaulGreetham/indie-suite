# Audit and fix status

Single source of truth for security-audit progress. Read this before starting any security or audit work, and update it after every fix.

- Detailed findings: [00-architecture.md](00-architecture.md) (Phase 1, `R-*`) and [02-security.md](02-security.md) (Phase 2, `S-*`).
- Last updated: 2026-10-30. Fixes 1–38 are written; fix 38 (`feat/retention-and-erasure`) is pushed and awaiting merge.

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
| S-04 | Vulnerable dependencies | High | Partial | `805175d`, `fc0e15a`, `e8c6060`, `6544696`. 9 non-reachable advisories remain (see next fixes) | [02 §4](02-security.md#4-new-findings) |
| S-05 | Third-party script without SRI or CSP | Medium | Fixed | `7d9b7b0`, `dbe7155` (Firma publishes no SRI hashes) | [02 §4](02-security.md#4-new-findings) |
| S-06 | Raw upstream errors returned to the browser; uid in URLs | Low | Fixed | `dc8b1bb`, `6fd065d` and the WS-2 route commits | [02 §4](02-security.md#4-new-findings) |
| S-07 | Storage not cleared on sign-out | Low | Fixed | `1f398c6` | [02 §4](02-security.md#4-new-findings) |
| S-08 | No `email_verified`/revocation checks; PDF links without tokens | Low | Fixed | `dc8b1bb`, `543f360`, `429242a` | [02 §4](02-security.md#4-new-findings) |
| S-09 | Privacy: policy/terms, deletion, export, retention | Medium | Partial | `577aa26` (retention + erasure; in PR). Policy/terms, data export and DPAs not started | [02 §4](02-security.md#4-new-findings) |
| S-10 | OG route spoofing; template upload checks | Low | Fixed | `edd6717` | [02 §4](02-security.md#4-new-findings) |

## Remaining fixes (priority order)

1. **NEXT → Merge `feat/retention-and-erasure` (fix 38, S-09)** and set `CRON_SECRET` and `ADMIN_API_SECRET` in Vercel. Until the secrets are set, the retention cron and erase route refuse every call.
2. **Privacy policy and terms (S-09).** Separate workload owned by the user: list processors (Google Cloud/Firebase, Vercel, Stripe, Firma, Mapbox, Upstash), Firestore region `europe-west4`, retention periods (below) and the erasure route. Needs the legal entity and a lawyer review.
3. **Data export (S-09, right to portability).** A "Download my data" ZIP (JSON + CSV). Deferred by the user.
4. **Remaining dependency advisories (S-04).** Then raise the CI audit gate from `critical` to `high`.
   - `firebase` client SDK 13 (gRPC advisory in its Node build; together with `@firebase/rules-unit-testing` 6)
   - Next 16 (bundled `postcss`/`picomatch`, build-time only)
   - `puppeteer-core` beyond 25.11 once `@sparticuz/chromium` ships Chrome 154+ (zod in `chromium-bidi`)
5. **R-16 counters.** `customers.eventsLinked` / `totalValue` and `venues.*` are never maintained. Compute them on read or maintain them server-side. Not security.
6. **Optional hardening.**
   - Verify App Check tokens on API routes as well.
   - Replace the two "business limit reached" dialogs' localStorage plan label with the server value. This is cosmetic, because the server enforces the limit.

## Decisions

- **`requireUser` defaults to `verifiedEmail: true`.** No route needs to work before verification. `/signup/verified` refreshes the ID token (`getIdToken(true)`) after `reload()` so the claim is current.
- **Firestore rules live in `firestore.rules`** with emulator tests in `apps/app/firestore-tests/`. They are published by pasting into the Firebase console (`firebase.json` is emulator-only). When a change moves client writes to the server, deploy the app first, then publish the rules.
- **The database was wiped twice** (no real customers), so rules and code don't carry legacy-data compatibility.
- **Server-written collections:** businesses (`/api/businesses`), invoices (`/api/invoices`) and contracts (`/api/contracts/generate`). Clients can't create or delete them.
- **Server-only collections:** `billing`, `stripe_events`, `integrations_firma`, `invoice_numbers` and `firma_workspace_cleanup`.
- **Billing is linked to the Firebase uid** via `billing/{uid}`, never by email (S-02).
- **Plans:** Pro, Portfolio and Agency (`pro`, `pro+`, `pro++`) offer the same features and differ only in business count (1/3/10, enforced server-side). Firma usage is unlimited.
- **Trial:** 90 days, no card, one per uid, started server-side at signup (`start-trial`). If there's no card at trial end, Stripe cancels.
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
- [ ] **Firebase App Check:**
  - [x] Fraud Defense (reCAPTCHA Enterprise) is registered.
  - [ ] Register local debug tokens.
  - [ ] Watch Metrics, then enforce Firestore and then Authentication.
- [ ] **Google Cloud:** restrict the Firebase browser API key to `app.indiesuite.app`, `*.vercel.app` and `localhost`.
- [ ] **Mapbox:** restrict the token to the same URLs.
- [ ] **Vercel (`indie-suite-app`, Production):**
  - [x] `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (Config)
  - [ ] `UPSTASH_REDIS_REST_URL` (Config) and `UPSTASH_REDIS_REST_TOKEN` (Secret)
  - [ ] `CRON_SECRET` and `ADMIN_API_SECRET` (Secrets, `openssl rand -hex 32`)
  - [ ] Delete `FIRMA_WORKSPACE_API_KEY` (no longer read)
  - [ ] Confirm the build uses Node 22.x
- [ ] **Stripe:**
  - [ ] Webhook endpoint `/api/stripe/webhook` with `checkout.session.completed` and `customer.subscription.*`, plus `STRIPE_WEBHOOK_SECRET`.
  - [ ] Customer portal allows payment-method updates; trial-ending reminder emails are on.
  - [ ] One test-mode run on Stripe SDK 23: trial, end trial, checkout, portal.
- [ ] **Firma:**
  - [ ] Delete old test workspaces (e.g. "Big Test Band Workspace").
  - [ ] Periodically process the `firma_workspace_cleanup` queue in the Firma dashboard.
- [ ] **GitHub:** enable Dependabot alerts and security updates (Settings → Code security).
- [ ] **Legal:** accept or sign DPAs with Google Cloud/Firebase, Stripe, Vercel, Firma, Mapbox and Upstash.
