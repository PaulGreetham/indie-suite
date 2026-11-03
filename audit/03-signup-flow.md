# Sign-up flow audit: marketing site to first login

Audit date: 2026-11-03. Audited commit: `f956893` on `main`, which is what production runs. I also checked the live Stripe webhook configuration, the Vercel production environment variable names and Vercel's runtime logs. I did not change any code.

The uncommitted branch `fix/plan-before-checkout` already changes parts of this flow. Where it does, the step says **Branch:**.

Findings are numbered **SU-01 onwards**. Severity: **Critical** means sign-up or billing is broken for real users now. **High** means a common path fails or money is at risk. **Medium** means a confusing or fragile path. **Low** means polish.

---

## Summary

- **Nobody can get into the app after paying (SU-01, Critical).** The live Stripe webhook points at `https://indiesuite.app/api/stripe/webhook`, which is the marketing site, and Stripe has **disabled** it. Vercel logs show no webhook request reaching the app. On `main`, the only way a Checkout result reaches `billing/{uid}` is that webhook, so every new user lands back on "Choose your plan" after adding a card. Choosing again opens a second Checkout.
- **Cancellations, failed payments and trial-end charges are never recorded either (SU-01).** The same disabled webhook means `billing/{uid}` never changes after a subscription starts. Someone who cancels in the portal keeps access in the app.
- **Yearly sign-ups always fail (SU-02, High).** Production only has `PRICE_PRO`, `PRICE_PRO_PLUS` and `PRICE_PRO_PLUS_PLUS`. None of the `PRICE_*_YEARLY` variables exist, so the yearly toggle on the marketing site and on `/subscribe` returns `invalid_plan`.
- **The plan is chosen implicitly (SU-03, High).** Only the pricing cards pass `?plan=`. The hero, header, drawer and call-to-action buttons don't, so those users are sent straight to a Pro Checkout without ever seeing a plan picker.
- The remaining findings are smaller: a stale-token dead end after verifying (SU-05), a verification email with no way back (SU-06), a Checkout page branded "Vertechx Collective" (SU-08), and a "Full name" field that is thrown away (SU-10).

---

## 1. The flow, step by step

### Step 1: Marketing site (`www.indiesuite.app`)

| Entry point | Link | Plan passed? |
|---|---|---|
| Pricing cards | `app.indiesuite.app/signup?plan=<pro\|pro-plus\|pro-plus-plus>&interval=<monthly\|yearly>` (`apps/marketing/src/components/sections/pricing.tsx:129`) | Yes |
| Hero, header, drawer, CTA | `app.indiesuite.app/signup` (`getSignupHref()`, `apps/marketing/src/lib/auth-links.ts`) | **No** |
| `www.indiesuite.app/signup` | 307 to `app.indiesuite.app/signup`, query kept (`apps/marketing/next.config.ts` `redirects()`) | Passes through |

Nothing is stored at this step. Links are built from `NEXT_PUBLIC_MAIN_APP_URL` at build time; production resolves it to `https://app.indiesuite.app` (checked live).

### Step 2: Sign-up form (`app.indiesuite.app/signup`, `components/signup-form.tsx`)

1. The user enters full name, email, password and confirmation. The form only checks that the two passwords match. Firebase's own minimum (6 characters) is the only password rule.
2. `createUserWithEmailAndPassword` (`signup-form.tsx:35`) creates the **Firebase Auth user** and signs them in. This is the first record created anywhere. Nothing is written to Firestore.
3. `sendEmailVerification(user)` (`:39`) sends Firebase's default verification email. No `actionCodeSettings`, so the link opens Firebase's hosted "email verified" page, with no link back to the app (SU-06). Failures are swallowed (`.catch(() => undefined)`).
4. The browser goes to `/signup/verified?plan=…&interval=…` (`:45`), defaulting to `pro` and `monthly`.

Data: Firebase Auth user `{uid, email, emailVerified: false}`. The "Full name" input is never read (SU-10).

### Step 3: Verify email (`/signup/verified`)

1. The page reads `auth.currentUser` once on mount (`verified/page.tsx:28`). Firebase may not have restored the session yet, so the email can be missing from the text and the button may say "I've verified, continue" even when the user is verified. Harmless, but untidy.
2. The user clicks the link in the email (in any tab or device), then returns to this tab and clicks the button.
3. The button handler reloads the user, rejects if still unverified, and calls `getIdToken(true)` (`:60`) so the ID token carries `email_verified: true`. Every billing route requires that claim (`requireUser`, `lib/server/auth.ts:43`).
4. **`main`:** it posts `{plan, interval}` to `/api/stripe/create-checkout-session` (`:65`) and redirects to the returned Stripe URL. The user never sees a plan picker here (SU-03).
   **Branch:** it goes to `/subscribe?plan=…&interval=…` instead, and the picker preselects that plan.

If the user isn't signed in on this device (e.g. they verified on their phone), the button alerts "Please sign in again" with no link to `/login`.

### Step 4: Create Checkout session (`POST /api/stripe/create-checkout-session`)

In order:

1. `requireUser` checks the Bearer token, revocation and `email_verified` (403 `email_unverified` otherwise).
2. `rateLimit(uid, "billing")`. **Off in production**: no `UPSTASH_REDIS_*` variables (Vercel logs: "rate limiting is disabled").
3. `getPriceIdForPlan(plan, interval)` (`:20`). Yearly returns `null` in production → 400 `invalid_plan` (SU-02).
4. `getOrCreateStripeCustomer(uid, email)` (`:24`). The first time, it creates a **Stripe customer** `{email, metadata.uid}` and writes **`billing/{uid}` = `{stripeCustomerId, createdAt, updatedAt}`**. This happens before any card is entered.
5. If `billing/{uid}.status` is live → 409 `already_subscribed` (`:28`). On `main` this is the **only** duplicate check, and it relies on the webhook (SU-04).
6. Trial eligibility: `!trialUsed && !subscriptionId` (`:30`).
7. Creates a Checkout session: subscription mode, `payment_method_collection: "always"`, trial of 90 days if eligible, `metadata.uid`, `client_reference_id`, `success_url = <base>/subscribe?checkout=success`, `cancel_url = <base>/subscribe?checkout=cancelled` (`:49-50`). `<base>` is `NEXT_PUBLIC_SITE_URL`, which production now sets to `https://app.indiesuite.app`.

**Branch:** before step 6 it also lists the customer's subscriptions in Stripe. If one is live it records it and returns 409. Any earlier subscription also removes trial eligibility.

### Step 5: Stripe Checkout (hosted by Stripe)

The user sees "Try Pro, 90 days free, then €20/month", enters a card and confirms. Stripe creates the **subscription** (`status: trialing`, `default_payment_method` set, `metadata.uid`). The page header shows the Stripe account name **"Vertechx Collective"**, not IndieSuite (SU-08).

Stripe then:
- redirects the browser to `success_url`
- sends `checkout.session.completed` and `customer.subscription.created` to the webhook endpoint, which **is disabled and points at the wrong host** (SU-01)

### Step 6: Back in the app (`/subscribe?checkout=success`)

1. `/subscribe` polls `POST /api/stripe/get-subscription` up to 10 times, 2 seconds apart (`subscribe/page.tsx:47`).
2. **`main`:** `get-subscription` decides `active` from `billing/{uid}.status` only (`get-subscription/route.ts:17`). Without the webhook, that never changes. After 20 seconds the page shows "Choose your plan" again (what you saw). Choosing a plan creates another Checkout session (SU-04).
   **Branch:** `get-subscription` sees the live subscription on the uid's own Stripe customer, records it in `billing/{uid}` (via `syncSubscription`) and returns `active: true`, so the page goes straight to the dashboard.
3. On a successful sync, `billing/{uid}` becomes `{stripeCustomerId, subscriptionId, status: "trialing", plan, currentPeriodEnd, cancelAtPeriodEnd, endedAt: null, trialUsed: true}`.

### Step 7: Webhook (`POST /api/stripe/webhook`)

Correct in code: it verifies the signature with `STRIPE_WEBHOOK_SECRET` (`webhook/route.ts:23`), skips duplicate events via `stripe_events/{eventId}` (`:31`), and re-reads the subscription from Stripe before mirroring it (`syncSubscription`, `lib/stripe/billing.ts`). It finds the uid through `billing.stripeCustomerId` (`billing.ts:62`), never through event metadata. It doesn't overwrite a different live subscription (`:71`).

The problem is the configuration (SU-01). I can't check whether the `STRIPE_WEBHOOK_SECRET` in Vercel matches this endpoint's signing secret without reading the value. Once the URL is fixed, Stripe's "Send test event" will show it.

### Step 8: Entering the app (`/dashboard/overview`)

`(app)/layout.tsx` wraps every page in three layers:

1. **`AuthGuard`**: no user → `/login` (`auth-guard.tsx:19`). Unverified email → "Verify your email, then refresh this page" (`:38`).
2. **`PlanGuard`**: calls `get-subscription`. Not active, or the call failed → `/subscribe` (`plan-guard.tsx:25`).
3. **`BusinessProvider`**: resolves the active business. A new user has none; pages that need one show "Create or select a business first."

On the first visit, a "Welcome! Let's get you started" dialog sends the user to `/tutorial`. Whether it has been shown is stored in `localStorage.introShown` (`layout.tsx:70-73`). That key is per browser, not per user, and isn't cleared on sign-out (SU-11).

From here, Firestore access from the browser works because the rules' `hasActivePlan()` reads `billing/{uid}.status`. Server routes enforce the same rule with `requireActiveUser` (402).

### Step 9: Later logins (`/login`)

`signInWithEmailAndPassword`, then `router.push("/dashboard/overview")` (`login-form.tsx:31`), then the same three guards. A fresh sign-in gets a fresh token, so it doesn't hit SU-05.

### Step 10: Data left behind by abandoned sign-ups

| Abandoned at | What exists | Cleaned up by |
|---|---|---|
| Before verifying | Auth user | Retention cron after 30 days (`cron/retention/route.ts:14`) |
| Verified, never opened Checkout | Auth user | After 12 months |
| Opened Checkout, never paid | Auth user, Stripe customer, `billing/{uid}` without `subscriptionId` | After 12 months (verified) or 30 days (unverified). Erasure also deletes the Stripe customer |

**The retention cron refuses every call in production** until `CRON_SECRET` is set (it isn't, and neither is `ADMIN_API_SECRET`).

---

## 2. Findings

| ID | Finding | Severity | Where | Fix |
|---|---|---|---|---|
| **SU-01** | The live Stripe webhook points at `indiesuite.app` (marketing) and is **disabled**. New subscriptions never activate accounts on `main`. Cancellations, failed payments and trial-end charges are never mirrored, so cancelled users keep access. | **Critical** | Stripe dashboard | Change the endpoint URL to `https://app.indiesuite.app/api/stripe/webhook`, re-enable it, send a test event, then resend the failed events for existing subscriptions. Keep the branch's self-heal in `get-subscription` as a backstop, but it only fixes users who open the app; it doesn't fix cancellations. |
| **SU-02** | No `PRICE_*_YEARLY` variables in production, so every yearly sign-up fails with `invalid_plan`. `PRICE_*_MONTHLY` are also missing; monthly works through the legacy `PRICE_PRO`, `PRICE_PRO_PLUS`, `PRICE_PRO_PLUS_PLUS` fallbacks. | **High** | Vercel env, `lib/stripe/server.ts:28` | Create yearly prices in Stripe (live) and set `PRICE_PRO_YEARLY`, `PRICE_PORTFOLIO_YEARLY`, `PRICE_AGENCY_YEARLY`. Or hide the yearly toggle until they exist. |
| **SU-03** | The plan is never chosen explicitly unless the user came from a pricing card. Hero/header/CTA sign-ups go straight to a Pro Checkout. | **High** (product) | `verified/page.tsx:65`, `auth-links.ts` | **Branch:** verify → `/subscribe` plan picker → Checkout → app. |
| **SU-04** | Duplicate subscriptions. On `main`, the only duplicate check reads `billing/{uid}`, which depends on the webhook, so a user sent back to the picker can start a second Checkout. Even on the branch, two Checkout tabs opened at the same time can both be completed, and Stripe would charge both after the trial. | **High** (money) | `create-checkout-session/route.ts:28` | **Branch** checks Stripe's live subscriptions before creating a session. To close the two-tabs case, have the webhook cancel any second live subscription for the same customer. |
| **SU-05** | Stale-token dead end. Verifying the email and then opening the app in a browser that's still signed in (without using the `/signup/verified` button) keeps the old ID token for up to an hour. `AuthGuard` passes (the user record says verified) but every billing call returns 403 `email_unverified`. `PlanGuard` sends the user to `/subscribe`, which shows "Your account needs an active subscription" and "Subscribe" fails with "Unable to start checkout". | **Medium** | `billing-client.ts:17` | On 403 `email_unverified`, retry once with `getIdToken(true)`. |
| **SU-06** | The verification email uses Firebase's default page, which has no link back to the app. The user has to find the original tab, or log in again. | **Medium** | `signup-form.tsx:39` | Pass `actionCodeSettings: { url: "https://app.indiesuite.app/signup/verified?plan=…&interval=…" }` so the hosted page shows a "Continue" button. |
| **SU-07** | Failures on `/subscribe` read as "you need to pay". `fetchSubscription` returns `null` on any error (`billing-client.ts:28`), and the page then shows the paid wording and a "Subscribe" button for trial-eligible users. | **Medium** | `subscribe/page.tsx:93` | Show a retry message when the check fails, rather than the paid wording. |
| **SU-08** | Stripe Checkout, receipts and card statements show "Vertechx Collective", not IndieSuite. New customers may not recognise the charge. | **Medium** (trust) | Stripe settings | Set the public business name, statement descriptor and branding in Stripe (Settings → Public details / Branding). |
| **SU-09** | No rate limiting in production (`UPSTASH_REDIS_*` unset), and no bot check on sign-up in code. Anyone can script account creation and Checkout sessions. | **Medium** | Vercel env | Add Upstash variables. Consider App Check / reCAPTCHA enforcement on Firebase Auth (the site key is set but enforcement is a console setting I can't see). |
| **SU-10** | "Full name" is collected and discarded. | **Low** | `signup-form.tsx` | Either save it (`updateProfile({ displayName })`) or remove the field. |
| **SU-11** | `introShown` is per browser, not per user, and isn't cleared on sign-out, so a second account on the same browser never sees the welcome dialog. | **Low** | `layout.tsx:70` | Key it by uid, or add it to `USER_STORAGE_KEYS`. |
| **SU-12** | `/signup/verified` reads `currentUser` once on mount, so it can show the wrong button label and no email. When nobody is signed in, the error has no link to `/login`. | **Low** | `verified/page.tsx:28` | Use `useAuth()` and add a log-in link. |
| **SU-13** | One trial per Firebase account, not per card or person. The same card can start unlimited trials with new email addresses. | **Low** now | `create-checkout-session` | Optional: record card fingerprints in the webhook and refuse a second trial. |

Environment gaps found alongside: `CRON_SECRET` and `ADMIN_API_SECRET` are not set in production, so retention and erasure don't run (see STATUS.md).

---

## 3. Recommended order

1. **SU-01 now**, in the Stripe dashboard. Nothing else matters until subscriptions reach the app.
2. **SU-02**: create yearly prices and set the variables, or hide the yearly toggle.
3. **Merge `fix/plan-before-checkout`**: fixes SU-03 and most of SU-04, and recovers users stuck by SU-01.
4. **SU-08** (Stripe branding), **SU-09** (Upstash) and the missing `CRON_SECRET` / `ADMIN_API_SECRET`: all settings, no code.
5. One code pass for SU-05, SU-06, SU-07, SU-10, SU-11 and SU-12, plus the webhook duplicate-cancel for SU-04.
