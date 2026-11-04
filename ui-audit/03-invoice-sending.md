# Sending invoices: current flow and proposal

Written 2026-11-04 at the product owner's request ("I cannot see a way of sending an invoice").

**Decided 2026-11-04:** S-1 one invoice with a payment schedule; S-2 send inside IndieSuite; S-3 Resend; S-4 and S-5 adopted as recommended. The model is summarised in CLAUDE.md ("Invoice model") and the work is UI-S01 to UI-S05 in UI-STATUS.md. Covers UX-69 and decision D-08 in [UI-STATUS.md](UI-STATUS.md). Paths are relative to `apps/app/src/`.

## 1. How it works today

1. Create the invoice (`invoices/create` → `InvoiceForm` → `POST /api/invoices`). It's saved as **Draft** unless the user picks another status in the form.
2. Go to All Invoices, find the row, click **Download** (`invoices/all/page.tsx:166-183`). This fetches `GET /api/invoices/[id]/pdf` and opens the PDF in a new tab as a blob URL.
3. Save the PDF, open your own email, attach it and write to the client.
4. Come back and change the status to "Sent/Open" from the status dropdown in the table (`invoices/all/page.tsx:226-253`).

There is no send action, no record of when or to whom an invoice went, and nothing moves an invoice to Overdue. Marketing describes exactly this ("downloaded or attached to emails", `apps/marketing/src/lib/config.tsx:186-187`).

**Why it matters:** statuses are only right if users remember steps 3 and 4. Overdue, "Owed to you", and the revenue and pipeline analytics all depend on those statuses.

### What the code already gives us

| Piece | State | Reuse for sending |
|---|---|---|
| PDF rendering | Server-side, owner-checked, rate-limited (`api/invoices/[id]/pdf/route.ts`, `lib/pdf/render.ts`) | Render the attachment in the send route with the same function |
| Client email | Copied onto the invoice at creation as `customer_email` from the booking's client (`InvoiceForm.tsx:216`) | Recipient, but it goes stale if the client's email changes. The send route should re-read it from the client through `eventId` |
| Business details | `user_business_name`, `user_email` on the invoice | Sender display name and reply-to |
| Rate limiting | Buckets `pdf`, `firma`, `billing`, `write` (`lib/server/rate-limit.ts:6`) | Add an `email` bucket |
| Email provider | **None** | New dependency (§3) |

### A model question the send flow has to answer first

An invoice document holds a **payment schedule** (e.g. deposit + balance), and **each payment row has its own invoice number, issue date and due date** (`InvoiceForm.tsx:386-411`). The All Invoices list shows one row per payment (`invoices/all/page.tsx:112-130`). But the PDF renders **the whole schedule as one document**, numbered with the first row's number (`lib/pdf/invoice-template.ts:81-83, 141-157`).

In practice, freelancers invoice the deposit when the booking is confirmed and the balance closer to the date. So "Send invoice" on the deposit row currently sends a PDF that is numbered as the deposit but lists, and totals, the balance too. **Decision S-1** below settles this before the send UI is built.

### What other invoicing tools do (researched 2026-11-04)

The two kinds of product IndieSuite sits between handle deposits differently. Neither gives each payment its own invoice number inside one document, which is what IndieSuite does today.

| Product type | Examples | Model |
|---|---|---|
| Booking/CRM tools for creatives (IndieSuite's closest comparison) | HoneyBook, Square Invoices | **One invoice, one number, with a payment schedule.** HoneyBook offers a single fee, a retainer plus final payment, or several payments over time, and requires the schedule to add up to the invoice total. Its community advice is to keep the retainer and balance on one schedule rather than two invoices. Square adds a deposit and split balance to a single invoice so one invoice tracks all payments. |
| Accounting software | Xero (and QuickBooks/FreeAgent similarly) | **One invoice = one amount owed; payments are recorded against it** (partial payment → "partially paid"). Deposits are a known gap: users record the deposit as a prepayment or part payment, then raise the final invoice and apply the deposit against it. |
| UK VAT | HMRC | A deposit paid before the work creates a tax point for that amount. That matters to VAT-registered users and their accountants, and is the main reason some prefer a separate deposit invoice. Confirm the details with an accountant before building VAT features. |

Sources: [HoneyBook community: retainer and final balance](https://community.honeybook.com/honeybook-product-talk-7/how-to-invoice-for-a-retainer-and-final-balance-in-honeybook-6130), [HoneyBook invoices FAQ](https://help.honeybook.com/en/articles/8729489-invoices-faq), [HoneyBook online invoices](https://honeybook.com/product/online-invoices), [Square: payments schedule](https://squareup.com/help/article/6732-payments-schedule-with-square-invoices), [Square: request deposits](https://squareup.com/help/gb/article/6581), [Xero ideas: deposits on invoices](https://productideas.xero.com/forums/967115-invoices-quotes/suggestions/44960308-invoicing-customers-to-pay-deposits-on-invoices), [HMRC VATTOS2225: advance payments](https://www.gov.uk/hmrc-internal-manuals/vat-time-of-supply/vattos2225).

**Recommended model for IndieSuite: one invoice, one number, a payment schedule** (the creative-tools norm):

- **What a client is billed for** is shown as line items (today there are none; payments double as descriptions). The **payment schedule** splits that total into instalments (label, amount, due date), and it must add up to the total.
- **Each instalment records its own payment** (paid date). Status follows from that: Sent → Partially paid → Paid. **Overdue** means an instalment is past its due date and unpaid.
- **Send the invoice once.** Then send a **payment reminder** for the next instalment when it's due, and a **receipt** for each payment received.
- **One invoice number per invoice**, reserved by the server as today (`lib/server/invoices.ts`). The per-row invoice numbers and issue dates go. There's no booking data yet, so this change is cheap now.
- **Later, if VAT-registered users need it:** "Bill the deposit separately" creates a deposit invoice and deducts it on the final invoice (the accounting-software pattern). Not needed for the first version.

How the invoice reads, both in the app and on the PDF:

```
Invoice INV-0042                                    Issued 4 Nov 2026
Big Beer Events  to  Acme Events
Smith wedding, The Barn, Sat 14 Nov 2026

Description                                                    Amount
Live set, 2 × 45 min                                        £1,200.00
                                                   Total    £1,200.00

Payment schedule
Deposit     due 4 Nov 2026                      £400.00   Paid 5 Nov
Balance     due 1 Dec 2026                      £800.00
                                                   Paid       £400.00
                                                   Amount due £800.00
```

"Amount due" is the one emphasised figure on the PDF: it's what the client needs to act on. In the app, the next unpaid instalment carries the yellow signal marker (01-inventory §0.2), and the record's primary action follows the state: **Send invoice** → **Send reminder** (when the next instalment is due) → **Record payment**.

## 2. Options

| | A. Send from IndieSuite (email provider) | B. Shareable invoice link | C. Open the user's own email app | D. Online payment (Stripe) |
|---|---|---|---|---|
| What the client gets | Email with the PDF attached, from "Business name via IndieSuite", replies go to the business | Email (via A) or a link the user pastes anywhere, opening a hosted invoice page | Email from the user's own address; user attaches the PDF themselves | Hosted invoice with a pay button |
| Automatic status and history | Yes: sent at, sent to, status → Sent | Yes, plus "Viewed" | Only if the user confirms ("Mark as sent") | Yes, plus "Paid" automatically |
| Effort | Medium: provider account, domain records, one server route, send dialog | Medium–high: public unauthenticated route, unguessable tokens, revocation | Small: `mailto:` + download + confirm | High: Stripe Connect onboarding for every user, fees, compliance |
| New security surface | Server-only API key; abuse risk of sending from our domain, contained by fixed recipients and rate limits | Public pages exposing invoice data, mitigated by token design | None | Large (payments) |
| Fit | The direct answer to "send an invoice" | Good second step once A exists | Stopgap, or an extra option for users who prefer their own mailbox | Separate product decision |

**Recommendation: A, with C kept as a secondary action.** A covers the core journey and gives reliable statuses. "Download PDF" and "Mark as sent" stay available for people who email from their own mailbox. B and D are follow-ups, not prerequisites.

## 3. Proposed design (option A)

### 3.1 Where sending lives

- **After creating an invoice** the user lands on it (UX-18), and the primary action is **Send invoice**.
- **On the invoice record** (sheet or page): primary **Send invoice** (or **Send again** once sent); secondary **Download PDF**, **Mark as sent**.
- **In the list:** one row per invoice with total, amount paid, next due date and status ("Sent 4 Nov", "Partially paid", "Overdue"), and a "Send" row action for drafts.

### 3.2 Send dialog

```
Send invoice INV-0042                                         ✕
─────────────────────────────────────────────────────────────
To        Jane Doe <jane@acmeevents.com>
          From Acme Events' client details. Edit client
          [✓] Send me a copy (bookings@bigbeerevents.com)

Subject   Invoice INV-0042 from Big Beer Events            [edit]

Message   Hi Jane,
          Please find attached invoice INV-0042 for the
          Smith wedding on 14 Nov 2026. £1,200.00 is due by
          30 Nov 2026.
          Thanks, Paul                                     [edit]

Attached  INV-0042.pdf   Preview
─────────────────────────────────────────────────────────────
                                   [Cancel]  [Send invoice]
```

- **The recipient isn't a free-text field.** It's the client's email on record, and changing it means editing the client. This stops the dialog being used to send mail to arbitrary addresses from our domain, and it follows CLAUDE.md's rule not to trust client-supplied data for anything server-built: the server loads the recipient itself.
- **Subject and message are prefilled and editable**, with length limits. The prefill uses real details: invoice number, booking, amount, due date and the sender's name.
- **If the client has no email**, the dialog shows "Add an email for Acme Events to send this invoice" with an "Edit client" button instead of the form. This matters now that client email is optional (UX-28).
- **Edge cases:**
  - If the invoice is already **Paid** or **Void**, the dialog warns first ("This invoice is marked paid. Send it anyway?").
  - Sending a draft moves it to **Sent**. Sending again keeps the status and adds a history entry.
- **After sending:** the toast says "Invoice sent to jane@acmeevents.com". The record shows "Sent 4 Nov 2026, 21:58 to jane@acmeevents.com", with earlier sends listed below it.
- **On a phone** the dialog is a bottom drawer (UI-A15 `ResponsiveDialog`).

### 3.3 The email itself

- **From:** `Big Beer Events via IndieSuite <invoices@mail.indiesuite.app>`. A sending subdomain keeps the main domain's reputation separate.
- **Reply-To:** the business contact email (`user_email` / trading details `contactEmail`), so the client's reply goes to the freelancer, not to IndieSuite.
- **Content:** a plain, readable message (the user's text), the PDF attached, and a footer line "Sent with IndieSuite". No tracking pixels.

### 3.4 Server

New route `POST /api/invoices/[id]/send`, following CLAUDE.md's conventions:

- `requireActiveUser`, `rateLimit(uid, "email")` (new bucket; suggested 5 per minute, 50 per day), `loadOwned("invoices", id, uid)`, errors through `handleRouteError`.
- Body: `{ subject, message, ccSelf, paymentIndex? }` only. The recipient, business name, reply-to and PDF are all built server-side from documents the caller owns: re-read the client through the invoice's booking, and fall back to `customer_email`.
- Render the PDF with `renderInvoicePdf` (same include-switch handling as the PDF route; factor that into a shared function). Because this is a PDF route, add it to `vercel.json` memory and duration settings and keep `next.config.ts` `serverExternalPackages`/`outputFileTracingIncludes` in sync (CLAUDE.md).
- Send through the provider with an idempotency key, so a double click sends once.
- In one transaction: append to `sends` (at, to, cc, subject, provider message id), set `sentAt`, and change the status from draft to sent. Only the server writes invoices, so the Firestore rules don't change. Server-built fields go through `stripUndefined`.
- The provider API key is a server-only env var (no `NEXT_PUBLIC_`), set by you in Vercel. Sending is server-side, so the browser CSP needs no change.

### 3.5 Later, once A works

- **Overdue derived from the due date** (already planned in UI-B05), rather than set by hand.
- **Reminders:** "Send reminder" on overdue invoices, using the same route with a reminder template.
- **Bounces:** a provider webhook marks a send as failed and tells the user ("The email to jane@… bounced. Check the client's address.").
- **Option B** (a "View invoice" link with viewed tracking), then **option D** if online payment becomes a goal.

## 4. Decisions needed

| ID | Question | Recommendation |
|---|---|---|
| S-1 | Is an invoice the whole schedule, or does each payment (deposit, balance) get its own invoice? | **One invoice, one number, with a payment schedule** (the HoneyBook/Square model, see "What other invoicing tools do" in §1). Add line items for what is billed; each instalment has a label, amount, due date and paid date; send once, then send reminders and receipts per instalment. Drop the per-row invoice numbers and issue dates. A separate deposit invoice can be added later for VAT-registered users. |
| S-2 | Option A (send from IndieSuite) as the main way to send? | Yes, with Download PDF and Mark as sent kept as secondary actions. |
| S-3 | Email provider | **Resend**: a simple API, idempotency keys, and attachments are supported. Postmark is the alternative if deliverability becomes a problem. Either needs an account and DNS records (SPF, DKIM, DMARC) for a sending subdomain, which you set up. Check current pricing and free-tier limits before choosing. |
| S-4 | Sending address | `invoices@mail.indiesuite.app`, display name "‹Business› via IndieSuite", replies to the business contact email. |
| S-5 | Can users change the recipient in the dialog? | **No.** It's the client's email on record; to change it, edit the client. This prevents abuse of our sending domain. |
| S-6 | Do we ship option C (open my email app + Mark as sent) now as a stopgap, before A? | Only "Mark as sent" and a proper Download (named file), which are already in UI-B05. A `mailto:` stopgap can't attach the PDF, so it adds little. |

## 5. Proposed plan items

Added to [UI-STATUS.md](UI-STATUS.md) once S-1 to S-5 are decided:

| ID | Item |
|---|---|
| UI-S01 | Provider account, sending subdomain DNS, server env var, `email` rate-limit bucket, shared "invoice PDF payload" function used by the PDF and send routes |
| UI-S02 | Invoice model per S-1: line items, payment schedule with paid dates, one number per invoice; PDF shows the schedule and amount due; list shows one row per invoice (total, paid, next due); `lib/invoices/fields.ts` and server tests updated |
| UI-S03 | `POST /api/invoices/[id]/send` with tests (ownership, rate limit, recipient from server data, idempotency, status and `sends` history) |
| UI-S04 | Send dialog and actions on the invoice record and list; sent history; no-email state |
| UI-S05 | Overdue derived from the due date; reminders; bounce webhook (follow-ups) |
