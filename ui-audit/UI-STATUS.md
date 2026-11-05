# UI migration and UX fix status

Single source of truth for the shadcn/ui migration and the UI/UX fixes in `apps/app`. Read it before starting UI work, and update it after every item.

- Findings: [01-inventory.md](01-inventory.md) (`INV-*`, components, tokens, design direction in §0) and [02-ux.md](02-ux.md) (`UX-*`, consistency, states, forms, accessibility, responsive, journeys).
- Last updated: 2026-11-05. Audit complete. Done: UI-F01 to UI-F03, UI-F08 to UI-F11 (F01, F02, F08–F11 merged in PR #79; F03 on `fix/ui-fix-first-2`). Invoice model and sending decided (D-08, UI-S01 to UI-S05); UI-S01 partly done.

## How to work through this plan

- **Order:** Fix first → Stage A → Stage B (in the order listed) → Stage C. Items within a stage can overlap where "Depends on" allows.
- **One item = one commit**, once it has been tested. Related items can share a PR. Record the commit in "Done in" and set the status.
- **Statuses:** **Not started**, **In progress**, **Done**, **Needs decision** (blocked on a product call, see the decisions table), **Won't do**.
- **Every item** passes `npm run lint`, `npm run test` and `npm run build`. Anything touching `firestore.rules` or a client write payload also needs matching tests in `apps/app/firestore-tests/` and `npm run test:rules -w app`; publish rules only after the app that depends on them is deployed (CLAUDE.md).
- **Every page migrated in Stage B** is checked in light and dark mode and at 375px, 768px and 1280px wide, using keyboard only for its main task. Then its help text (`lib/help.tsx`) is updated and the old components it used are deleted if nothing else uses them.
- **Severity** is the highest severity among the findings an item covers.

## Decisions

| ID | Decision | Status | Date |
|---|---|---|---|
| D-01 | Audience is freelance creatives with bookings (not only performers) | Confirmed | 2026-11-04 |
| D-02 | Typeface is Inter, with marketing's character variants (cv02, cv03, cv04, cv11, salt) | Confirmed | 2026-11-04 |
| D-03 | Radius 6px (`--radius: 0.375rem`) | Confirmed | 2026-11-04 |
| D-04 | Analytics scoped to the active business, with an "All businesses" option | Confirmed | 2026-11-04 |
| D-05 | UI terms: **Bookings**, **Clients**, **Locations**, **Business details**. Stored names (`events`, `customers`, `venues`, `venue_*`) stay unchanged | Confirmed | 2026-11-04 |
| D-06 | Rename routes (`/events` → `/bookings`, `/customers` → `/clients`, `/venues` → `/locations`) with redirects | Needs decision | |
| D-07 | Add an optional fee and status (enquiry / confirmed / completed / cancelled) to bookings (UX-67) | Needs decision | |
| D-08 | Send invoices from the app by email: **yes, inside IndieSuite, through Resend**. Invoice model: one invoice number, line items, a payment schedule with paid dates, status derived from it. Recorded in CLAUDE.md; reasoning in [03-invoice-sending.md](03-invoice-sending.md). S-4 (sending address `invoices@mail.indiesuite.app`) and S-5 (recipient fixed to the client's email) adopted as recommended | Confirmed | 2026-11-04 |
| D-09 | Track contract signing through a Firma webhook (UX-75) | Needs decision | |
| D-10 | Deleting a client or location used by bookings: block, archive, or allow with a warning (UX-21) | Needs decision | |
| D-11 | Add a `kind` field to locations (venue / studio / client / online) (UX-30) | Needs decision | |

## Fix first (independent of the migration)

Data loss, broken pages and a script-injection issue in today's code. Each is a small change to the existing components, so it shouldn't wait for Stage B. Stage B rebuilds the same screens later and must keep these fixes.

| ID | Item | Covers | Sev | Status | Done in | Done when |
|---|---|---|---|---|---|---|
| UI-F01 | Seed invoice notes when editing; keep notes and payment link when their "include" switch is off | INV-A1 | High | Done | `a760747`
| UI-F02 | Stop forms clearing on a failed save: switch Customer, Venue, Trading details, Bank account and Invoice forms from `<form action>` to `onSubmit`, and reset only on success | INV-A2 | High | Done (committed; manual browser test pending) | `4d06018`
| UI-F03 | Invoice edit "Cancel" leaves edit mode instead of wiping payment rows | UX-23 | High | Done | `f66468b`
| UI-F04 | Receipts: working pagination, plus a "Receipts" nav entry | INV-A3 | High | Not started | | 11+ paid invoices are all reachable |
| UI-F05 | Build the map popup with DOM nodes and `textContent`, not `setHTML`; record it in `audit/STATUS.md` as a security item | INV-A4 | Medium | Not started | | A venue named `<img src=x onerror=alert(1)>` renders as text |
| UI-F06 | Catch and report errors on delete, invoice status change, invoice edit, contract generate and contract send | UX-17 | High | Not started | | Each failure shows a specific toast; no control stays stuck in a pending state |
| UI-F07 | Pending/disabled state on booking and contract submit; booking create navigates away after success | UX-19, UX-18 (bookings), UX-64 | High | Not started | | Double-clicking Generate creates one contract; a saved booking can't be saved twice |
| UI-F08 | Sidebar Operations in workflow order: Customers, Venues, Events, Invoices, Contracts (Clients, Locations, Bookings after UI-A21). Order only, no step numbers: the sections are revisited daily, not completed once | Product owner request 2026-11-04 | Medium | Done | `159d9fc`
| UI-F09 | Ask for business details first: client, venue, event, invoice and contract pages show "Add your business details first" with one action when the user has no business, instead of a form that fails on save with a link-less toast. The business details page opens the add form and returns to the original page after saving (`?next=`, same-site paths only) | Product owner report 2026-11-04 (with INV-A2 confirmed in the browser: the client form was cleared) | High | Done | `def9b5f`
| UI-F10 | "Copy details from a client" on Create Venue: fills the venue name, phone, website and address from a client of the active business. Booking-level "Use client's address" follows in UI-B03 | Product owner request 2026-11-04, UX-30 | Medium | Done | `ee18b7c`
| UI-F11 | Client pickers name clients by their business (company), falling back to the contact name, sorted by that name: shared `clientLabel()` used by the event form and Create Venue. Other screens move to it in Stage B (UX-32) | UX-32 (partial), product owner report 2026-11-04 | Medium | Done | `1e8524d`

## Stage A: foundations

Install and configure shadcn and the theme, then build the shared app components. Nothing user-visible changes page by page yet, except the theme (A04–A06), which changes the whole app at once.

| ID | Item | Covers | Sev | Depends on | Status | Done in | Done when |
|---|---|---|---|---|---|---|---|
| UI-A01 | Add `apps/app/components.json` (new-york, neutral, CSS variables, `@/` aliases, lucide), modelled on marketing's | INV-01 | High | — | Not started | | `npx shadcn add <x> --dry-run` resolves paths in `apps/app` |
| UI-A02 | Make `apps/app/src/components/ui` the owner of `button`, `card`, `input`, `label` and `cn` (regenerate locally; drop unused `brand`/`outlineBrand`/`orange` variants). `packages/ui` stays for marketing | INV-02, INV-08 | High | A01 | Not started | | No `@indie-suite/ui` import in `apps/app`; marketing unchanged |
| UI-A03 | Rename the custom select to `components/legacy-select.tsx` (import changes only) | INV-03 | High | — | Not started | | `components/ui/select.tsx` is free for shadcn |
| UI-A04 | Rewrite the theme in `globals.css` per `01-inventory.md` §0.3/§6.6: one `:root` and one `.dark`, all `oklch`; `--brand`; neutral `--accent`/`--sidebar-accent`; Ink focus ring in light mode; true-black dark background and Graphite surfaces; Concrete muted text; one Rule border; `--status-*` tokens; `--chart-1..3` as full colours with `--color-chart-*` in `@theme inline`; `--radius: 0.375rem`; remove the `[data-chart]` block; replace every yellow literal | INV-04, INV-05, INV-30, INV-31, INV-32, INV-33, INV-34, INV-41, INV-42, INV-50, UX-39, UX-40, UX-41 | High | A02 | Not started | | No hex/hsl colour literals outside `globals.css` (grep); focus ring ≥ 3:1 in both themes; hovering menus and the sidebar shows no yellow; logo box invisible in dark mode |
| UI-A05 | Load Inter with `next/font/google` and marketing's features; add the §0.3 type scale and `tabular-nums` utility conventions | INV-46, INV-47, D-02 | Medium | A04 | Not started | | Inter renders on macOS, Windows and Android; page titles use the scale |
| UI-A06 | Dark mode fixes: drop hardcoded `className="dark"` on `<html>`; Firma editor, Sonner and Mapbox follow the resolved theme; toasts use tokens, not yellow | §6.5, INV-57, INV-58 | Low | A04 | Not started | | No theme flash on load in light mode; map and Firma editor match the theme |
| UI-A07 | Regenerate the 25 existing shadcn components from the registry and install `select`, `command`, `form` (+ react-hook-form, @hookform/resolvers, zod), `dialog`, `drawer`, `radio-group`, `toggle-group`, `alert`; build the `combobox` recipe | INV §7, INV-06, INV-07, INV-51 | Medium | A02, A03, A04 | Not started | | All components import from `components/ui`; app builds; no visual regressions on existing pages beyond the new tokens |
| UI-A08 | Move `StatusBadge` and `InfoPopover` out of `components/ui/`; delete `AccountForm` and the never-opened tutorial `IntroDialog` | INV-09, INV-10 | Low | A07 | Not started | | `components/ui/` contains registry components only |
| UI-A09 | Shared helpers: `lib/format.ts` (dates, times, money via `formatCurrency`), `lib/status.ts` (invoice and contract statuses: label, token, badge style), `lib/plans.ts` (ids, labels, limits, prices, features) | INV-17, INV-29, INV-29d, UX-10, UX-11, UX-12 | Medium | — | Not started | | Unit tests for each helper; one name per status |
| UI-A10 | `PageHeader` (title, description, actions, back link, breadcrumb title) | INV-20, INV-48, UX-04 | Medium | A05 | Not started | | Used by one pilot page |
| UI-A11 | `EmptyState` (no-data and no-match variants, icon, action) | INV-16, UX-15 | Medium | A07 | Not started | | Component tests for both variants |
| UI-A12 | Loading: `FullPageLoader` for guards; table, card, chart and form skeletons; remove the hand-built spinners | INV-14, INV-15, UX-14 | Medium | A07 | Not started | | Guards and `(app)/loading.tsx` use the shared loaders |
| UI-A13 | Data hooks returning `{ data, loading, error, retry }`, scoped to the active business, refetching on business switch; inline error `Alert` with retry | UX-13, UX-16 | High | A07 | Not started | | Switching business refreshes every list that uses the hook; a failed load shows "Couldn't load … Try again", never the empty state |
| UI-A14 | `DataTable` family: toolbar (search across columns, filters), `DataTableColumnHeader` (button, `aria-sort`), view options with human labels, `DataTablePagination` (buttons, "Page 2 of 5"), skeleton and empty states, a focusable primary cell that opens the record, right-aligned tabular figures, mobile column priorities; no selection column unless bulk actions exist | INV-12, INV-13, INV-13b, INV-13c, INV-56, UX-22, UX-36, UX-45, UX-46, UX-56 | High | A11, A12, A13 | Not started | | Keyboard-only: tab to a row, open it, sort, page. Usable at 375px |
| UI-A15 | `RecordSheet`: right `Sheet` on desktop, bottom `Drawer` on mobile, view and edit modes, header actions (Edit, More → Delete); plus a `ResponsiveDialog` wrapper | INV-24, UX-06, UX-55 | High | A07 | Not started | | Opening a row on a phone shows the record immediately |
| UI-A16 | `ConfirmDeleteDialog` (names the record and the consequence, stays open while pending, shows errors inline) and a `runMutation` helper (pending state, specific success/error toasts, `saveErrorMessage`) | INV-19, UX-17, UX-21 | High | A07 | Not started | | Failed delete keeps the dialog open with the error |
| UI-A17 | Form building blocks: `FormSection`, `AddressFields`, `DatePicker`/`DateTimePicker` (past dates allowed), `EntityCombobox` with search and "New …" opening an inline dialog, repeater rows (`useFieldArray`), correct input types and `autoComplete`; "(optional)" marking convention | INV-21, INV-22, INV-23, INV-26, INV-27, INV-54, UX-27, UX-31, UX-33, UX-43, UX-47 | High | A07, A09 | Not started | | Story/test page shows each block with an inline field error |
| UI-A18 | `StatusBadge` rebuilt (dot + label, `--status-*` tokens, filled style for overdue only) and an interactive status cell (`Button` trigger, `aria-label`) | INV-29, INV-53, UX-37 | High | A04, A09 | Not started | | Status can be changed by keyboard |
| UI-A19 | `StatStrip` and `ChartCard` (title, description, loading, empty, error, text summary, `accessibilityLayer`, one height scale, animation only on first render and never under reduced motion); then delete `NumberTicker` | INV-28, INV-43, INV-45, INV-49, UX-51 | Medium | A04, A12 | Not started | | Figures appear immediately; charts announce a summary to screen readers |
| UI-A20 | `BusinessLimitDialog` shared by the team switcher and business details | INV-18 | Medium | A09 | Not started | | One copy, reads limits from `lib/plans.ts` |
| UI-A21 | Navigation and shell copy: apply D-05 terms in `lib/nav.ts` (Bookings, Clients, Locations, Business details; shorter item names), redirect the placeholder section pages, logo links to the dashboard, `/login` redirects signed-in users, breadcrumbs take page titles | UX-01, UX-02, UX-07, UX-08, UX-09, INV-11 | Medium | A10, D-05 | Not started | | No placeholder page is reachable; the logo never shows the login form to a signed-in user |

## Stage B: migrate pages, most-used first

Each item migrates one page or feature onto the Stage A components and fixes the findings listed for it. Remove old components once nothing uses them (tracked in UI-B17).

| ID | Item | Covers | Sev | Depends on | Status | Done in | Done when |
|---|---|---|---|---|---|---|---|
| UI-B01 | **App shell:** sidebar (active item in yellow, neutral hover), team switcher ("Businesses", no fake ⌘ shortcuts), header (wordmark hidden on mobile or moved to sidebar), mode toggle as a radio group, first-run welcome as a dismissible `Dialog` | INV-50, UX-49, UX-50, UX-58 | Medium | A04, A21 | Not started | | Shell checked in both themes and at 375px |
| UI-B02 | **Bookings list** (`/events/all`) on `DataTable` + `RecordSheet`; search title, client and location; dates via `lib/format`; deep-linkable `?open=<id>` | INV-12, INV-24, UX-03, UX-10, UX-55, UX-56 | High | A14, A15, A16 | Not started | | Find, open, edit and delete a booking by keyboard and on a phone |
| UI-B03 | **Booking form** (create and edit) on RHF + zod: required start date, end after start, past dates allowed, client and location `EntityCombobox` scoped to the business, default location pre-filled, "Use client's address"; navigates to the new booking; "Create booking" / "Save changes" | UX-05, UX-18, UX-19, UX-29, UX-30, UX-31, UX-32, UX-64, UX-65, UX-66 | High | A17, B02 | Not started | | A booking can be created in the past, with the user's studio pre-filled, without leaving the form to add a client |
| UI-B04 | **Clients:** list and record sheet; form with name + email-or-phone, address and notes under "More details"; label rule `clientLabel()`; after create, opens the client with "New booking for …" | UX-28, UX-32, UX-61, UX-62, UX-63 | Medium | A14, A15, A17 | Not started | | A client with only a phone number can be saved |
| UI-B05 | **Invoices list** and record sheet: right-aligned money via `formatMoney`, keyboard status cell, confirmation for Void/Paid, "Download PDF" (named file) and "Mark as sent" side by side, overdue derived from the due date, no cross-currency totals | INV-29c, INV-56, UX-11, UX-20, UX-37, UX-69 (minimum), UX-72 | High | A14, A15, A18 | Not started | | Overdue shows without manual status changes; amounts line up |
| UI-B06 | **Invoice form** on RHF + zod with `useFieldArray` payments: business defaults to the active one, one description field per payment, read-only booking details as a `<dl>`, labelled switches, mobile payment cards with visible labels, suggested next invoice number, per-currency totals, "Create invoice" from a booking pre-fills it | INV-A1, UX-24, UX-25, UX-26, UX-42, UX-44, UX-52, UX-70, UX-71 | High | A17, B05, UI-F01, UI-F03 | Not started | | Invoice can be created on a phone; editing never loses notes or payments |
| UI-B07 | **Receipts** folded into invoices: "Download receipt" on paid invoices, Receipts becomes a "Paid" filter (keep the route as a redirect) | INV-A3, UX-73 | High | B05 | Not started | | All receipts reachable from the invoice list |
| UI-B08 | **Locations:** list, sheet and form (renamed from Venues); map inside the sheet with a geocoding skeleton, theme-aware style and "Open in Maps" | UX-30, UX-57, INV-57, UI-F05 | Medium | A14, A15, A17 | Not started | | Map loads inside the sheet in both themes |
| UI-B09 | **Contracts:** list on `DataTable` (search all rows), contract page (booking, terms, notes, timeline, send/resend), "Send to client" confirmation listing recipients, status badges; Create Contract checks the template first and shows an `EmptyState` if missing | UX-20, UX-76, UX-77, UX-78 | High | A14, A16, A18 | Not started | | A user without a template is guided to set one up before filling the form |
| UI-B10 | **Contract templates:** `Card` instead of `ContentPanel`, starter picker as `RadioGroup`, "Template ready" state without internal IDs, field names in a collapsible section, small-screen notice for the editor | INV-29b, UX-59, UX-79 | Low | A07, A06 | Not started | | No workspace or template IDs shown |
| UI-B11 | **Calendar:** responsive months (1 / 2 / 3–4), booked days via `modifiers` with a dot and label, the day's bookings in a `Table` beside or below, deep links into bookings | UX-48, UX-54 | High | A14, B02 | Not started | | Usable at 375px; booked days identifiable without colour |
| UI-B12 | **Overview dashboard** (§0.4): next booking panel, "Owed to you" summary, upcoming list with deep links, bookings-per-month bar and revenue-by-status stacked bar; one `useOverviewAnalyticsData` hook scoped per D-04 | INV-35, INV-36, INV-37, INV-38, INV-44, UX-68 | High | A13, A19, B05 | Not started | | Opens with the next booking and money owed; every item links to its record |
| UI-B13 | **Analytics Revenue and Bookings:** `StatStrip`, `ChartCard`, wrapping header with "Preset / Custom" toggle group and business scope selector, one-month range picker in a `Drawer` on mobile, figures per currency, readable chart colours in light mode | INV-39, INV-40, INV-44, INV-49, UX-11, UX-53 | High | A13, A19 | Not started | | Header fits at 375px; numbers match the lists for the active business |
| UI-B14 | **Settings:** business details and bank accounts on `RecordSheet` + RHF and refetching on business switch; General page change-email and reset-password in `Dialog`s without vendor names; Billing; Subscriptions with `RadioGroup` plans, `ToggleGroup` billing period and real billing currency | INV-25, INV-29b, UX-12, UX-13, UX-34 (settings part) | Medium | A15, A17, A20 | Not started | | No form lives in an AlertDialog |
| UI-B15 | **Auth and subscribe:** login and signup on RHF with mapped Firebase errors, reset-password `Dialog`, verified page without `alert()`, subscribe plan picker as `RadioGroup` | UX-34, UX-35, UX-60 | Medium | A07, A17 | Not started | | A wrong password shows "Email or password is incorrect" |
| UI-B16 | **Notification feed** page (rename "Upcoming") using the Overview list component | UX-02, UX-68 | Low | B12 | Not started | | Items open their record |
| UI-B17 | **Cleanup:** delete `legacy-select.tsx`, `ContentPanel`, unused `@radix-ui/*` packages, `packages/ui` imports from the app, leftover hand-built tables, pagination and dialogs | INV-03, INV-06, INV-12 | Low | B01–B16 | Not started | | `grep` finds no legacy components; bundle builds without them |

## Invoice model and sending (D-08)

Design in [03-invoice-sending.md](03-invoice-sending.md). Do these after the Fix-first items and before UI-B05/B06, because they change the invoice data the Stage B invoice pages are built on. There is no booking data yet, so the model change needs no migration beyond test invoices.

| ID | Item | Covers | Sev | Depends on | Status | Done in | Done when |
|---|---|---|---|---|---|---|---|
| UI-S01 | Resend account, sending subdomain DNS (SPF, DKIM, DMARC) and `RESEND_API_KEY` in Vercel (set by the product owner); `email` rate-limit bucket; shared "invoice PDF payload" function used by the PDF and send routes | UX-69 | High | D-08 | Partial: Resend domain `mail.indiesuite.app` verified (eu-west-1, open/click tracking off), sending-only `RESEND_API_KEY` in Vercel Production and `.env.local`, documented in `.env.example` (2026-11-04). DMARC `v=DMARC1; p=none;` added at `_dmarc.indiesuite.app`. Left: `email` rate-limit bucket, shared PDF payload function | | A test email from the sending domain passes SPF/DKIM |
| UI-S02 | Invoice model: line items, payment schedule (label, amount, due date, paid date) that must equal the total, one invoice number per invoice, derived status; `lib/invoices/fields.ts` + server tests; PDF shows the schedule and amount due; list shows one row per invoice | UX-25, UX-70, INV-A3 (receipts per payment) | High | — | Not started | | Deposit + balance invoice renders one PDF with "Amount due"; status moves Sent → Partially paid → Paid |
| UI-S03 | `POST /api/invoices/[id]/send`: `requireActiveUser`, rate limit, `loadOwned`, recipient and reply-to built server-side, Resend idempotency key, `sends` history and `sentAt`, draft → sent; PDF route config kept in sync (`vercel.json`, `next.config.ts`) | UX-69 | High | S01, S02 | Not started | | Route tests cover ownership, rate limit, server-built recipient, idempotency |
| UI-S04 | Send dialog (fixed recipient, editable subject and message, copy to self, no-email state, paid/void warning), "Send invoice / Send reminder / Record payment" actions, sent history on the record | UX-69, UX-20 | High | S03, A15 | Not started | | An invoice can be sent, reminded and paid from its record |
| UI-S05 | Follow-ups: overdue derived from due dates, reminder template, Resend bounce webhook | UX-69 | Medium | S03 | Not started | | A bounced email shows on the invoice |

## Stage C: UX and accessibility beyond the migration

| ID | Item | Covers | Sev | Depends on | Status | Done in | Done when |
|---|---|---|---|---|---|---|---|
| UI-C01 | Accessibility pass on every migrated page: automated checks (axe via `jest-axe` in vitest for shared components) plus a manual keyboard and screen-reader run of the four core journeys | UX-36–UX-51 (verification) | High | B01–B15 | Not started | | No axe violations in shared components; the four journeys complete by keyboard |
| UI-C02 | Copy pass: sentence case, no `·`-joined meta strings, action verbs carried from button to toast, no vendor names, one name per status | INV-55, UX-05 | Low | B01–B15 | Not started | | Copy review sign-off |
| UI-C03 | Rewrite help text for every page and remove references to removed features | UX-74 | Low | B01–B15 | Not started | | Help matches the shipped UI |
| UI-C04 | Replace the welcome dialog and Tutorial page with a data-driven setup checklist on Overview | UX-49, UX-81 | Medium | B12 | Not started | | New account sees progress based on real data |
| UI-C05 | Booking hub: the booking sheet shows its invoices and contracts with statuses and create actions | UX-80 | Medium | B02, B05, B09 | Not started | | From one booking you can invoice, contract and see both statuses |
| UI-C06 | Deleting clients and locations used by bookings | UX-21 | Medium | D-10 | Needs decision | | Per D-10 |
| UI-C07 | Booking fee and status fields; invoices pre-fill from them (rules + tests) | UX-67 | Medium | D-07 | Needs decision | | Per D-07 |
| UI-C08 | Send invoices by email from the app: delivered as UI-S01 to UI-S05 below | UX-69 | High | D-08 | Not started | | See UI-S items |
| UI-C09 | Contract signing status from Firma (webhook with signature verification, or polling) | UX-75 | High | D-09 | Needs decision | | Contract shows viewed/signed/declined |
| UI-C10 | Location `kind` field (rules allow-list + tests) | UX-30 (optional part) | Low | D-11 | Needs decision | | Per D-11 |
| UI-C11 | Route renames with redirects | UX-01 (routes) | Low | D-06 | Needs decision | | Old URLs redirect |
| UI-C12 | Share the brand tokens and font with marketing so both apps match | INV-52 | Medium | A04, A05 | Not started | | Marketing primary is the brand yellow; both load Inter the same way |

## Coverage

Every finding in `01-inventory.md` and `02-ux.md` maps to at least one item above (checked by script when this file was written). INV-07 (Recharts upgrade) is covered by A07 only to the extent of keeping Recharts 2; the upgrade itself is deliberately out of scope.
