# Phase 1: Component and design inventory (`apps/app`)

Read-only audit, 2026-11-04. Paths are relative to `apps/app/src/` unless they start with `apps/` or `packages/`. Line numbers refer to the code at commit `9ff266c`.

**Revision 3 (same day):** §0 updated with the product owner's decisions: audience is freelance creatives in general (not only performers), Inter to match marketing (replacing the proposed IBM Plex pair), 6px radius, and analytics scoped to the active business (INV-44, INV-46, INV-52 and the token map updated to match).

**Revision 2 (same day):** every finding was re-checked against the code and the design guidance was added. Changes: corrected three counts (INV-14, INV-47, INV-48), widened INV-44 (*all* analytics ignore the active business, not just Overview), corrected the `--chart-1` hex (INV-30), added §0 (design direction) and INV-50 to INV-58, and revised INV-28, INV-31, INV-45 and INV-46 and the chart and status palettes in light of §0.

Finding IDs in this file use the `INV-` prefix. Severity is **High** (broken behaviour, data loss or blocks the migration), **Medium** (visible inconsistency or real friction) or **Low** (cleanup).

## Summary

- **The app is already half on shadcn/ui.** 26 shadcn-style primitives live in `components/ui/`, and every chart already uses shadcn's `ChartContainer` + Recharts. The migration is mostly **consolidation**, not a rewrite.
- **Three things block a clean `shadcn add`.** There is no `components.json`. Four primitives (`button`, `card`, `input`, `label`) are re-exports from `packages/ui`, so the CLI would overwrite the re-export files. `components/ui/select.tsx` is a custom DropdownMenu-based component that occupies the name of shadcn's real `Select`.
- **The biggest duplication is the list page.** Customers, Events, Invoices and Venues each hand-build the same TanStack table, filter bar, column toggle, sort arrows, pagination, inline detail card and delete dialog (≈350–500 lines each). Contracts and Receipts are two more hand-rolled variants. One shared `DataTable` replaces all six.
- **No form library.** Six forms use three different patterns (uncontrolled `FormData`, controlled `useState`, and a hybrid) with HTML `required` as the only validation. Moving them to react-hook-form + zod is the right call for all of them.
- **Tokens are mostly right but leaky.** The theme uses shadcn variables, but the brand yellow appears as six different literals, chart colors are hardcoded per chart (and one is invalid), and the `--chart-*` variables are in the old HSL-triplet format.
- **Design: shadcn alone won't give the app an identity (§0).** The brand already has one: a monospace wordmark on signal yellow. Today yellow is spent on every hover, the type is the system default, and the dashboard is the stock four-cards-and-a-donut layout. §0 makes yellow a signal only, sets Inter (matching marketing) with deliberate figures and titles, uses true-black dark mode and a tighter 6px radius, and builds the dashboard around the next booking and money owed. The brief and these choices were confirmed on 2026-11-04.
- **Defects found along the way** (details in the appendix and in `02-ux.md`): editing an invoice wipes its notes, the Receipts table can never show more than 10 rows, React 19's automatic form reset can wipe a form when a save fails, and the venue map popup injects venue names as raw HTML.

---

## 0. Design direction

Standardising on shadcn fixes consistency, but on its own it produces the stock shadcn look: neutral greys, `rounded-xl` cards around everything, a row of four big-number KPI cards, a donut. That is roughly what the app looks like today. This section sets the point of view the migration applies, so Stage A builds tokens and shared components *for this product* rather than for any SaaS dashboard.

**Decisions confirmed by the product owner (2026-11-04):** the audience below, Inter as the typeface to match marketing, the tighter 6px radius ("it needs to be different from normal AI slop"), and analytics scoped to the active business with an optional "All businesses" view.

### 0.1 Brief (confirmed)

- **Subject:** the admin side of freelance creative work: clients, bookings, a calendar, invoices, contracts and insight into how the business is doing.
- **Audience:** freelance creatives whose work comes as bookings. Marketing names photographers, videographers, DJs, bands, musicians, session and voiceover artists, theatre performers, makeup artists, stylists, tattoo artists and studios (`apps/marketing/src/components/sections/logos.tsx:12-29`), from solo freelancers to agencies running up to 10 businesses. They aren't accountants, and many check the app on a phone between jobs.
- **Primary job:** know what is booked next and who still owes money, then turn a booking into a sent invoice and contract quickly. Marketing promises exactly this ("Create bookings, invoices & contracts at a fraction of the time", `features.tsx:9`), and so does the tutorial ("event → invoice is designed to be a 30-second flow", `tutorial/page.tsx:78`).
- **Vocabulary:** marketing talks about **bookings** and **clients**; the app says **Events** and **Customers**. The wider audience also rules out performer-only words like "gig" in the product UI: a tattoo artist or makeup artist has bookings, not gigs. The wireframe below uses "booking" and "client" as the working terms; Phase 2 (`02-ux.md`) makes the terminology call and lists every place it changes.
- **Every booking happens somewhere, but "Venue" is the wrong word for most of them.** A studio, a client's home or "Online" are all valid places, and the rules already allow a venue with only a name. The issue is the label and re-entering your own studio each time, so the UI says **Location** (`02-ux.md` UX-30).

### 0.2 What the brand already says

The logo (`public/assets/indiesuitelogolong.svg`) is a **black monospace wordmark on electric yellow `#FCF300`**. It reads like a highlighter mark or a tag on a booking sheet, which suits a tool whose job is "what needs my attention".

Yellow on near-black is also one of the most common generic dark-UI looks, and Inter is the most common SaaS typeface. Both are fixed by the brand, so identity has to come from how they are used. Four choices do that:

1. **Yellow is a signal, not a theme.** It marks the one thing on a screen you should act on or notice (the primary action, the current nav item, the next booking). Today it is also the hover colour of every menu item, ghost button and sidebar row, the skeleton pulse and the toast colour (`--accent` and `--sidebar-accent` are yellow, `globals.css:55,66,85,95`). Used everywhere, it no longer marks anything. See INV-31.
2. **Inter, set deliberately.** Use the same Inter and the same character variants as marketing (cv02, cv03, cv04 and cv11 give open digits and a single-storey `a`, `apps/marketing/src/app/globals.css:205-213`), so the product feels like the site you signed up on. Then make the type do work: tight tracking on page titles, tabular figures for every amount and date column, and one large figure for the money owed on the dashboard. The monospace stays in the wordmark only. See INV-46.
3. **Dark mode is true black**, matching the logo artwork (`darklonglogo.svg` is drawn on a solid `#000` box). Today the dark background is `oklch(0.145 0 0)` ≈ `#0a0a0a`, so the logo sits in a faintly visible box in the header (`(app)/layout.tsx:129`). See INV-50.
4. **Tighter, squarer shapes:** 6px radius instead of shadcn's 10px, and frames only where content is a self-contained object. This echoes the blocky wordmark and is the most visible step away from the default card kit.

### 0.3 Tokens

| Name | Hex | Role |
|---|---|---|
| Signal yellow | `#FCF300` | `--primary`, `--ring` (dark), current nav item, next-booking marker. At most one prominent use per screen. |
| Ink | `#000000` | Dark `--background`; light-mode `--foreground` and `--primary-foreground` (black on yellow ≈ 17:1). |
| Graphite | `#161616` | Dark `--card`/`--popover`, i.e. raised surfaces. One step only, no stacked greys. |
| Paper | `#FFFFFF` | Light `--background`/`--card`. |
| Concrete | `#8A8A8A` (dark) / `#5C5C5C` (light) | `--muted-foreground`. Both ≥ 5.5:1 on their background. Today's light value `oklch(0.556 0 0)` ≈ `#737373` is 4.7:1, which passes but leaves no margin on `bg-muted` surfaces. |
| Rule | `#2A2A2A` (dark) / `#D6D6D6` (light) | `--border`/`--input`/`--sidebar-border`. |

Status hues are kept separate from the brand so a status is never confused with "act here". **No amber or yellow status colours:** today "Partially paid" is `bg-amber-500` (`StatusBadge.tsx:12`), which sits right next to the brand yellow. Draft and void are neutral grey, sent/open blue, partially paid teal, paid green and overdue `--destructive` red. They go in as `--status-*` tokens and feed both badges and charts (INV-29, §5).

**Type (confirmed: Inter).** Load Inter with `next/font/google` (self-hosted, so the CSP needs no change) and apply the marketing character variants on `body`: `font-feature-settings: "cv02", "cv03", "cv04", "cv11", "salt"` (the exact set marketing uses). The scale is 12 / 14 / 16 / 20 / 24, plus 32 for the one hero figure on the dashboard:

| Role | Size / weight | Treatment |
|---|---|---|
| Page title | 24 / 600 | `tracking-tight` (−0.02em) |
| Section heading | 16 / 600 | |
| Body, controls, table cells | 14 / 400 | |
| Labels, buttons | 14 / 500 | |
| Captions, helper text | 12 / 400 | `muted-foreground` |
| Figures (money, counts, dates in tables) | inherit | `tabular-nums`, right-aligned in tables |
| Hero figure (money owed) | 32 / 600 | `tabular-nums tracking-tight` |

Two weights in everyday use (400 and 500), and 600 for headings and the hero figure. The `font-bold` uses go. Sentence case everywhere: drop the `uppercase tracking-wide` group labels (`components/ui/select.tsx:98`) when the select is replaced.

**Shape (confirmed):** `--radius: 0.375rem` (6px). With the shadcn scale that gives controls `rounded-md` (4px) and cards, sheets and dialogs `rounded-lg` (6px). Nothing sets its own radius. Hierarchy comes from spacing, rules and type, not from wrapping each block in a shadowed card.

### 0.4 Layout principles

- **Lists are the product.** Clients, bookings, invoices and venues are tables people scan. Make them dense, left-aligned text, right-aligned tabular figures, a hairline rule between rows, no card around the table, and the record opening in a side sheet. Nothing in the list should move on hover except the row tint.
- **Forms are sections on the page, not cards in cards.** Today each form wraps all its fields in a `Card` (e.g. `CustomerForm.tsx:77`), and the list pages then put that form inside a second `Card` (`customers/all/page.tsx:365`). Use `FormSection`s separated by a rule, with one action bar.
- **The dashboard opens with the job, not with charts.** Today Overview is four equal chart cards (two near-identical donuts and a radar) followed by the notification feed (`dashboard/overview/page.tsx:35-42`). What a freelancer needs first is *the next booking* and *who still owes money*. Proposed shape:

```
┌──────────────────────────────────────────────────────────────┐
│ Overview                     [This year ▾] [This business ▾] │
├──────────────────────────────────────────────────────────────┤
│ Next booking ▌ Sat 14 Nov  14:00   Bridal makeup, Hotel Du Vin│  ← yellow marker
│               Invoice sent    Contract not signed   [Open]   │
├────────────────────────────┬─────────────────────────────────┤
│ Owed to you    £3,240.00   │ Coming up (next 5)              │
│  overdue £640 (2)          │  14 Nov  Bridal makeup          │
│  due in 4 weeks £1,200     │  21 Nov  Product shoot, Studio 2│
│ [View invoices]            │  …                              │
├────────────────────────────┴─────────────────────────────────┤
│ Bookings per month (bar)    │ Revenue by status (bar)        │
└──────────────────────────────────────────────────────────────┘
```

- **Analytics follow the active business** (confirmed), with "All businesses" as an explicit choice for multi-business plans, shown in the page header so it's always clear which scope the numbers cover. See INV-44.
- **One deliberate moment of motion at most.** Today every KPI counts up on each filter change (`NumberTicker`, 800 ms) and every chart animates for 600–1200 ms. Motion should answer actions (a sheet opening, a toast confirming) and nothing else. See INV-45.
- **Copy is part of the design.** Plain verbs, sentence case, the same word for the same action from button to toast. INV-55 lists the current inconsistencies; `02-ux.md` covers terminology.

### 0.5 Review against generic defaults

| Choice | Generic default? | Decision |
|---|---|---|
| Yellow on black | Yes ("near-black with one bright accent") | Kept, because the logo fixes it. Differentiated by true black and by restricting yellow to a signal. |
| Inter | Yes (the most common SaaS face) | Kept for consistency with marketing (confirmed). Differentiated by the marketing character variants, tight titles, tabular figures and one hero figure, rather than by the face itself. |
| 10px radius on everything | Yes (shadcn default) | Revised: 6px, and frames only where they mean something (confirmed). |
| Four KPI cards with big numbers | Yes (the stock "big number, small label" treatment) | Revised: the dashboard leads with the next booking and money owed. The Revenue and Bookings pages use a compact `StatStrip` (INV-28). |
| Cards for every block | Yes (the SaaS card kit) | Revised: tables and forms are not boxed; cards only where content is a self-contained object (a stat strip, a chart, a plan option). |
| Meta strings joined by `·` | Yes | Revised: today "Weekly totals · All time" (`BookingsBarChart.tsx:37`), "Invoice · customer" (`notification-feed.tsx:50`), "title · date" (`InvoiceForm.tsx:115`, `ContractForm.tsx:52`). Use separate, labelled lines or columns instead (INV-55). |

---

## 1. Styling approach, libraries and shadcn compatibility

### 1.1 What is in use

| Area | What the app uses | Where |
|---|---|---|
| Styling | Tailwind CSS v4 (`tailwindcss ^4.1.11`, `@tailwindcss/postcss`), CSS-first config, no `tailwind.config.*` | `app/globals.css`, `apps/app/postcss.config.mjs` |
| Animation | `tw-animate-css` | `app/globals.css:2` |
| Class merging | `clsx` + `tailwind-merge` via `cn` | `packages/ui/src/lib/cn.ts`, re-exported by `lib/utils.ts` |
| Variants | `class-variance-authority` | `packages/ui/src/components/button.tsx`, `components/ui/badge.tsx`, `components/ui/sidebar.tsx` |
| Primitives | Individual `@radix-ui/react-*` packages (13 of them) | `apps/app/package.json` |
| Icons | `lucide-react ^0.544` | everywhere |
| Theme | `next-themes`, class strategy, default dark | `app/layout.tsx:20-22` |
| Toasts | `sonner ^2` via `components/ui/sonner.tsx` | `app/layout.tsx:27` |
| Tables | `@tanstack/react-table ^8` (4 pages) and hand-rolled tables (3 pages) | see §3 |
| Dates | `react-day-picker ^9` (shadcn `Calendar`), `date-fns ^4` | `components/ui/calendar.tsx` |
| Charts | `recharts ^2.15` through shadcn `components/ui/chart.tsx` | `components/analytics/*` |
| Number animation | Custom `NumberTicker` (Magic UI style) | `components/ui/number-ticker.tsx` |
| Maps | `mapbox-gl` | `components/MapboxMap.tsx` |
| Forms | None (no react-hook-form, no zod) | see §4 |
| Fonts | None loaded. No `next/font`; the body falls back to Tailwind's default system sans stack | `app/layout.tsx:21` |

### 1.2 Compatibility with shadcn/ui

| Requirement | Status | Notes |
|---|---|---|
| Tailwind v4 | ✅ | shadcn's current registry targets v4 (`@theme inline`, `tw-animate-css`, `data-slot` attributes). The existing primitives are already the v4 versions. |
| Next.js 15 / React 19 | ✅ | `next 15.5.28`, `react 19.3.1`. shadcn's v4 components use plain function components without `forwardRef`, which suits React 19. |
| Path alias | ✅ | `@/*` → `./src/*` in `apps/app/tsconfig.json`. |
| `components.json` | ❌ | Missing in `apps/app`. `apps/marketing/components.json` exists (style `new-york`, base `neutral`, lucide) and is a good template. |
| CSS variables | ⚠️ | Present, but see INV-04 and §6. |
| Monorepo layout | ⚠️ | `button`, `card`, `input`, `label`, `cn` and `ThemeProvider` live in `packages/ui` and are re-exported by one-line files in `components/ui/`. See INV-02. |

### 1.3 What must change before `shadcn add` (Stage A prerequisites)

| ID | Sev | File | Problem | Fix |
|---|---|---|---|---|
| INV-01 | High | `apps/app/` (missing) | No `components.json`, so the CLI cannot place components or resolve aliases. | Add `apps/app/components.json` mirroring marketing: `style: "new-york"`, `rsc: true`, `tsx: true`, `tailwind.config: ""` (v4), `tailwind.css: "src/app/globals.css"`, `baseColor: "neutral"`, `cssVariables: true`, aliases `@/components`, `@/components/ui`, `@/lib/utils`, `@/lib`, `@/hooks`, `iconLibrary: "lucide"`. |
| INV-02 | High | `components/ui/button.tsx:1`, `card.tsx:1-9`, `input.tsx:1`, `label.tsx:1`, `lib/utils.ts:1`, `components/theme-provider.tsx:1`; `packages/ui/src/*` | Four primitives are one-line re-exports of `@indie-suite/ui`. `shadcn add button` (or any component that depends on it) will overwrite these files with a second, divergent copy. Marketing also imports `@indie-suite/ui` (`apps/marketing/src/components/ui/{button,card,input,label}.tsx`), so changing the package changes both apps. | Decide one owner. **Recommended:** make `apps/app/src/components/ui/` the source of truth for the product app. Copy the four components in as real files (via `shadcn add button card input label --overwrite`), point `lib/utils.ts` at a local `cn`, and leave `packages/ui` to marketing until it is migrated too. The alternative (shadcn's monorepo mode with a `components.json` in `packages/ui`) is more work for little gain at this size. |
| INV-03 | High | `components/ui/select.tsx:1-122` (7 importers) | A custom "Select" built on `@radix-ui/react-dropdown-menu`. It is not a listbox, has no `id`/`name`, cannot be labelled, doesn't support type-ahead, and takes the filename shadcn's `Select` needs. | Rename it to `components/legacy-select.tsx` (one import change per caller) **before** running `shadcn add select`, then migrate callers to shadcn `Select` or `Combobox` (§2) and delete it. |
| INV-04 | Medium | `app/globals.css:110-124` | `--chart-1`…`--chart-5` are HSL triplets (`48 100% 49%`), the shadcn v3 format, while everything else is a full colour value. `var(--chart-2)` is therefore not a valid colour (see INV-41). They are also missing from `@theme inline`, so `bg-chart-1` etc. don't exist. | Redefine as full colours (`--chart-1: oklch(...)`), add `--color-chart-1..5: var(--chart-N)` to `@theme inline`, and update `RevenueChart.tsx:23` from `hsl(var(--chart-1))` to `var(--chart-1)`. |
| INV-05 | Medium | `app/globals.css:9-39` | `@theme inline` lacks `--radius-sm`, `--color-chart-*` and the destructive-foreground pair the current shadcn theme block includes. Two `:root`/`.dark` blocks exist (lines 41/72 and 111/118). | Replace with the current shadcn v4 `@theme inline` block, merged into one `:root` and one `.dark`, then re-apply the brand overrides (§6). |
| INV-06 | Low | `apps/app/package.json` | 13 separate `@radix-ui/react-*` packages. Newer shadcn components import from the unified `radix-ui` package. Mixing both works but duplicates code paths. | Let `shadcn add` install what it needs. Once every primitive is regenerated, remove the unused individual `@radix-ui/*` packages in one cleanup commit. |
| INV-07 | Low | `apps/app/package.json` (`recharts ^2.15.4`), `components/ui/chart.tsx` | `chart.tsx` is the Recharts-2 version of shadcn's chart. | Keep Recharts 2 for the migration. Upgrade Recharts and `chart.tsx` together in a separate change, after checking which Recharts major the current shadcn chart registry entry targets. |
| INV-08 | Low | `packages/ui/src/components/button.tsx:13,18,25` | Custom Button variants `brand`, `outlineBrand`, `orange` (which isn't orange). None are used in either app. | Drop them when the button is regenerated. Brand yellow is already `primary`. |

---

## 2. Reusable component inventory

### 2.1 Primitives in `components/ui/`

"Stock" means the file matches the shadcn v4 registry closely enough to regenerate it with `shadcn add <name> --overwrite` and no behaviour change.

| Component | File | State | Importers | Action |
|---|---|---|---|---|
| Button | `components/ui/button.tsx` → `packages/ui` | Stock + 3 unused variants | 36 | Regenerate locally (INV-02, INV-08) |
| Card (+Header/Title/Description/Action/Content/Footer) | `components/ui/card.tsx` → `packages/ui` | Stock | 30 | Regenerate locally |
| Input | `components/ui/input.tsx` → `packages/ui` | Stock | 20 | Regenerate locally |
| Label | `components/ui/label.tsx` → `packages/ui` | Stock | 14 | Regenerate locally |
| AlertDialog | `components/ui/alert-dialog.tsx` | Stock | 13 | Keep. Stop using it for forms (INV-25) |
| Separator | `components/ui/separator.tsx` | Stock | 9 | Keep |
| Table | `components/ui/table.tsx` | Stock | 6 | Keep. Wrap in `DataTable` (§3) |
| Pagination | `components/ui/pagination.tsx` | Stock | 6 | Keep, but use inside `DataTable` only |
| DropdownMenu | `components/ui/dropdown-menu.tsx` | Stock | 6 (+select) | Keep |
| Chart | `components/ui/chart.tsx` | Stock (Recharts 2) | 6 | Keep (INV-07) |
| Sidebar | `components/ui/sidebar.tsx` | Stock | 5 | Keep |
| Skeleton | `components/ui/skeleton.tsx` | Stock | 4 | Keep. Use far more (see `02-ux.md`) |
| Badge | `components/ui/badge.tsx` | Stock | 5 | Keep. Status styling lives in `StatusBadge`, driven by `--status-*` tokens (INV-29, INV-53) |
| Popover | `components/ui/popover.tsx` | Stock | 4 | Keep |
| Checkbox | `components/ui/checkbox.tsx` | Stock | 4 | Keep |
| Calendar | `components/ui/calendar.tsx` | Stock (react-day-picker 9) | 4 | Keep |
| Switch | `components/ui/switch.tsx` | Stock | 3 | Keep |
| Textarea | `components/ui/textarea.tsx` | Stock | 2 | Keep, and use it for every "Notes" field (INV-22) |
| Spinner | `components/ui/spinner.tsx` | Stock | 2 | Keep. Replace the 4 hand-built spinners (INV-14) |
| Avatar | `components/ui/avatar.tsx` | Stock | 1 | Keep |
| Breadcrumb | `components/ui/breadcrumb.tsx` | Stock | 1 | Keep |
| Collapsible | `components/ui/collapsible.tsx` | Stock | 1 | Keep |
| Sheet | `components/ui/sheet.tsx` | Stock | 0 direct (sidebar mobile) | Keep. Will host record detail/edit panels (§3) |
| Tooltip | `components/ui/tooltip.tsx` | Stock | 0 direct (sidebar) | Keep |
| Tabs | `components/ui/tabs.tsx` | Stock | **0** | Keep for Settings consolidation, or delete if unused after Stage B |
| Sonner (Toaster) | `components/ui/sonner.tsx` | Modified: hardcoded success colours | 1 | Keep; move colours to tokens (INV-30) |
| **Select (custom)** | `components/ui/select.tsx` | **Not shadcn**: DropdownMenu posing as a select | 7 | Replace (INV-03) |
| **StatusBadge** | `components/ui/StatusBadge.tsx` | Custom wrapper, hardcoded palette colours | 1 | Keep as an app component, rebuilt on Badge variants (INV-29) |
| **InfoPopover** | `components/ui/info-popover.tsx` | Custom wrapper on Popover | 1 | Keep as an app component; move out of `ui/` |
| **NumberTicker** | `components/ui/number-ticker.tsx` | Custom (Magic UI-style), hardcoded `en-GB` | 2 | **Delete** after Stage B: figures show immediately (INV-45) |

| ID | Sev | File | Problem | Fix |
|---|---|---|---|---|
| INV-09 | Low | `components/ui/StatusBadge.tsx`, `info-popover.tsx`, `number-ticker.tsx` | App-specific components sit in `components/ui/`, the folder the shadcn CLI owns. Regenerating or `--overwrite` can clobber them, and the casing is inconsistent (`StatusBadge.tsx` vs kebab-case). | Move `StatusBadge` and `InfoPopover` to `components/` (e.g. `components/status-badge.tsx`, `components/info-popover.tsx`); delete `number-ticker.tsx` (INV-45). Keep `components/ui/` for registry components only. |

### 2.2 App-level components

| Component | File | What it does | Used in | shadcn target | Keep custom? |
|---|---|---|---|---|---|
| `AppSidebar` | `app/(app)/_components/app-sidebar.tsx` | Sidebar shell; loads contact name from Firestore | `(app)/layout.tsx` | Sidebar (already) | Yes. Move the Firestore read into `BusinessProvider` |
| `NavMain` | `components/nav-main.tsx` | Collapsible nav groups | `app-sidebar` | Sidebar + Collapsible (already) | Yes |
| `NavUser` | `components/nav-user.tsx` | User menu + log-out confirm | `app-sidebar` | DropdownMenu + AlertDialog + Avatar (already) | Yes |
| `TeamSwitcher` | `components/team-switcher.tsx` | Business switcher, plan label, limit dialog | `app-sidebar` | DropdownMenu + AlertDialog (already) | Yes. Remove duplicated plan logic (INV-17) and the fake `⌘1` shortcuts (line 149) |
| `ModeToggle` | `components/mode-toggle.tsx` | Light/dark/system | header | DropdownMenu (already) | Yes. Use `DropdownMenuRadioGroup` so the current theme is shown |
| `AnalyticsPageHeader` | `app/(app)/_components/analytics-page-header.tsx` | Title + date filter | 3 analytics pages | — | Fold into a general `PageHeader` with an `actions` slot |
| `DateTimeFilter` | `components/filters/date-time-filter.tsx` | Switch between preset range and custom range | `AnalyticsPageHeader` | Select / ToggleGroup | Yes, rebuilt: replace the Switch "Toggle Date Filter" with a `ToggleGroup` ("Preset" / "Custom") |
| `DateTimeRangePicker` | `components/filters/date-time-range-picker.tsx` | Popover with Calendar + time inputs | `DateTimeFilter` | Popover + Calendar + Select | Yes, rebuilt on shadcn `Select` |
| `NotificationFeed` | `app/(app)/dashboard/_components/notification-feed.tsx` | Upcoming events/payments list | Overview, Notifications | Card + `ItemList`/Table + Skeleton + EmptyState | Yes |
| `ContentPanel` | `app/(app)/contracts/templates/_components/content-panel.tsx` | Bordered section with title | Contract templates only | **Card** (exact duplicate) | **No**, replace with `Card` |
| `CustomerForm` / `VenueForm` / `EventForm` / `InvoiceForm` / `ContractForm` / `TradingDetailsForm` / `BankAccountForm` | `components/*/` | Entity forms | create pages + inline edit cards | Form (react-hook-form + zod) | Yes, rebuilt (§4) |
| `AccountForm` | `components/settings/AccountForm.tsx` | Profile form | **nothing** | — | **Delete** (INV-10) |
| `MapboxMap` | `components/MapboxMap.tsx` | Mapbox map with marker | Venues | — | Yes (no equivalent). Fix INV-A4 |
| `FirmaTemplateEditor` | `components/firma/FirmaTemplateEditor.tsx` | Embeds Firma's editor script | Contract templates | — | Yes. Pass the current theme instead of hardcoded `"dark"` (line 84) |
| `AuthGuard` / `PlanGuard` | `components/auth-guard.tsx`, `components/plan-guard.tsx` | Client guards with full-screen loaders | `(app)/layout.tsx`, `/subscribe` | Spinner/Skeleton + Button | Yes. Use `Spinner` and `Button` (INV-14, INV-15) |
| `LoginForm` / `SignupForm` | `components/login-form.tsx`, `components/signup-form.tsx` | Auth forms | `/login`, `/signup` | Form + Dialog (reset password) | Yes, rebuilt (§4) |
| `IntroDialog`, `GuideDialog`, `QuickStep`, `Bullet` | `app/(app)/tutorial/page.tsx:106-173` | Onboarding dialogs + step list | Tutorial | AlertDialog → Dialog; Card/`Item` | `IntroDialog` is never opened (`open` starts `false` and nothing sets it, line 11): delete it |

| ID | Sev | File | Problem | Fix |
|---|---|---|---|---|
| INV-10 | Low | `components/settings/AccountForm.tsx:1-140` | Dead component: no importers. | Delete. |
| INV-11 | Low | `app/(app)/{customers,events,invoices,venues,contracts,settings}/page.tsx`, `app/(app)/analytics/page.tsx` | Seven section index pages are placeholders (a bare `<h1>`, and the shadcn sidebar demo skeleton on `/analytics`, `analytics/page.tsx:4-9`). They are reachable from the breadcrumb (`(app)/layout.tsx:105-107`). | Make each a `redirect()` to its first sub-page (as `/dashboard/page.tsx` already does), or make the breadcrumb's parent crumb non-linking. Covered in `02-ux.md`. |

---

## 3. Duplication

Each group lists every copy, the count, and what replaces it.

| ID | Sev | Group | Copies | Count | Replacement |
|---|---|---|---|---|---|
| INV-12 | High | **List page (table + filter + columns + sort + pagination + inline detail + delete)** | `customers/all/page.tsx:141-451`, `events/all/page.tsx:63-352`, `invoices/all/page.tsx:185-497`, `venues/all/page.tsx:139-515`; hand-rolled variants `contracts/all/page.tsx:86-225`, `invoices/receipts/page.tsx:58-158` | 6 (≈2,100 lines) | One `DataTable<T>` (shadcn data-table recipe: Table + TanStack) with `DataTableToolbar` (search, filters, column toggle), `DataTableColumnHeader` (sortable header button with lucide arrows), `DataTablePagination`, built-in loading skeleton rows and empty state. Record details open in a `Sheet` (desktop) / `Drawer` (mobile) instead of a card below the table. |
| INV-13 | Medium | Sort indicator `▲`/`▼` text glyphs in clickable `<th>` | `customers/all:286-290`, `events/all:223-227`, `invoices/all:362-366`, `venues/all:323-327`, `contracts/all:156-163` | 5 | `DataTableColumnHeader` (a real `<button>` with `aria-sort`). |
| INV-13b | Medium | Pagination wiring (prev/next/page links with `href="#"`, manual `pageIndex` mirror) | `customers/all:336-361`, `events/all:261-286`, `invoices/all:409-431`, `venues/all:373-398`, `contracts/all:213-225`, `receipts:144-158` (non-functional) | 6 | `DataTablePagination` (Buttons, not `href="#"` links). |
| INV-13c | Low | Column-visibility dropdown listing raw column IDs (`fullName`, `addressFull`, `invoice_number`, plus non-hideable `select`/`actions` on invoices) | `customers/all:241-264`, `invoices/all:321-343`, `venues/all:280-303` | 3 | `DataTableViewOptions` using each column's `meta.label`. |
| INV-14 | Medium | Loading indicators | Hand-built CSS spinner: `auth-guard.tsx:27`, `plan-guard.tsx:34`, `customers/all:220`, `venues/all:261`. "Loading…"/"Loading..." strings: 21 in 15 files (3 of them are captions under the spinners above), incl. `notification-feed.tsx:108`, `contracts/all:146,248`, `contracts/[id]:45`, `contracts/templates:183`, `trading-details:63`, `bank-accounts:36`, `invoices/all:378,449`, `events/all:237`, `subscribe:32,87`, `signup:20`, `signup/verified:13,53`. Animated pulse divs: `(app)/loading.tsx:4-6` | 4 spinners + 18 text + 1 | `Spinner` for in-button/inline waits; `Skeleton` layouts for content (`TableSkeleton`, `CardSkeleton`, `FormSkeleton`); one `FullPageLoader` for guards. |
| INV-15 | Low | Raw `<button>` restyled to look like Button | `auth-guard.tsx:44-52`, `login-form.tsx:56-68`, `info-popover.tsx:19-27`, `contracts/templates/page.tsx:211-223` | 4 | `Button` (`variant="link"`/`"ghost"`, `size="icon"`); the template picker becomes a `RadioGroup` of cards. |
| INV-16 | Medium | Empty states (plain text, inconsistent wording: "No customers yet.", "No results.", "No events", "Nothing scheduled yet.") | `customers/all:306`, `events/all:239`, `venues/all:343`, `invoices/all:401`, `receipts:138`, `contracts/all:178`, `calendar:184`, `notification-feed:110`, `trading-details:65`, `bank-accounts:38` | 10 | `EmptyState` (icon, title, description, primary action such as "Create customer"). Distinguish "no data yet" from "no matches for this filter". |
| INV-17 | Medium | Plan id → label mapping and business limits | `team-switcher.tsx:56,154`, `settings/trading-details/page.tsx:33,51`, `settings/subscriptions/page.tsx:26-93`, `subscribe/page.tsx:18-27` (different keys: `pro-plus` vs `pro+`) | 4 | One `lib/plans.ts` (id, label, limit, prices, features) consumed by all four. The server limits in `/api/businesses` stay the authority. |
| INV-18 | Medium | "Business limit reached" AlertDialog | `team-switcher.tsx:177-201`, `settings/trading-details/page.tsx:95-118` | 2 | One `BusinessLimitDialog`. |
| INV-19 | Medium | Delete confirmation AlertDialog | `customers/all:426-451`, `events/all:332-352`, `invoices/all:473-497`, `venues/all:491-515`, `trading-details:120-147`, `bank-accounts:60-81` | 6 | One `ConfirmDeleteDialog` (title, description, async `onConfirm` with pending state and error toast). Note 4 of 6 copies have no error handling. |
| INV-20 | Medium | Page header (`<h1 className="text-2xl font-semibold mb-4|mb-6">`, sometimes with description or actions) | 30 `<h1>`s across every page (e.g. `customers/all:229`, `events/create:13`, `contracts/templates:163-167`, `contracts/[id]:54-62`) with `mb-4` vs `mb-6` vs none | 30 | `PageHeader` (title, optional description, `actions` slot, optional back link). |
| INV-21 | Medium | Address field block (6 inputs + section label) | `CustomerForm.tsx:104-132`, `VenueForm.tsx:91-118`, `TradingDetailsForm.tsx:78-105`, `AccountForm.tsx:101-128` (dead) | 3 live | `AddressFields` built on `FormField`. |
| INV-22 | Low | "Notes" fields as single-line `Input` | `CustomerForm.tsx:139`, `VenueForm.tsx:125`, `EventForm.tsx:132`, `BankAccountForm.tsx:88` (vs `Textarea` in `InvoiceForm.tsx:467`, `ContractForm.tsx:127`) | 4 | `Textarea` everywhere. |
| INV-23 | Medium | Date picker (Popover + Calendar + trigger Button) | `EventForm.tsx:149-211` (`DateTimeField`), `InvoiceForm.tsx:482-511` (`PaymentDatePicker`), `filters/date-time-range-picker.tsx:64-163` | 3 | `DatePicker` and `DateTimePicker` (shadcn date-picker recipe), one formatting helper. |
| INV-24 | Medium | Inline read-only → edit detail card under a table (Edit / Delete / ✕ in `CardAction`, form with `readOnly`) | `customers/all:364-424`, `events/all:288-330`, `invoices/all:433-471`, `venues/all:437-489`, `contracts/all:227-261`, `trading-details:149-191`, `bank-accounts:83-111` | 7 | Record `Sheet` with a view mode and an edit mode, or a dedicated `/[id]` page (contracts already has one). |
| INV-25 | Medium | Forms inside `AlertDialog` | `settings/general/page.tsx:81-123` (change email), `login-form.tsx:79-112` (reset password) | 2 | `Dialog` + Form. `AlertDialogAction` closes on click, so the pending/status text in these dialogs is never seen. |
| INV-26 | Low | Repeating-row editors (add row / remove "×" button) | `InvoiceForm.tsx:386-434` (payments), `ContractForm.tsx:101-119` (terms) | 2 | `useFieldArray` + a shared `RepeaterRow` (icon Button with `Trash2`, label). |
| INV-27 | Low | Form section labels (`<p className="text-sm font-medium text-muted-foreground">`) and separators | 6 forms (`CustomerForm:81`, `VenueForm:76`, `EventForm:88`, `TradingDetailsForm:60`, `BankAccountForm:57`, `AccountForm:73`) | 6 | `FormSection` (title + optional description) or shadcn `FieldSet`/`FieldLegend` if the installed shadcn version provides the Field components. |
| INV-28 | Medium | Stat card (title, big number with ticker, caption, skeleton) | `analytics/RevenueMetrics.tsx:89-164` (4 cards + `RevenueMetricValue`/`RevenueMetricText`), `analytics/BookingsMetrics.tsx:69-128` (4 cards + `BookingsMetricValue`/`BookingsMetricText`) | 8 cards, 4 helpers | One `StatStrip`: a single bordered row divided into cells by vertical rules, not four floating cards. Each cell has a label, a `tabular-nums` value and a caption, plus loading/error. Four separate shadowed cards with a big number is the stock dashboard treatment (§0.5). A strip reads as one summary and takes half the height on mobile, where it becomes a 2×2 grid. Errors go once under the strip, not inside the first card (`RevenueMetrics.tsx:99-103`). |
| INV-29 | Medium | Status → label/colour maps | `StatusBadge.tsx:6-13`, `invoices/all:238-244`, `InvoiceForm.tsx:293-299`, `OverviewDonutRevenue.tsx:22-29`, `OverviewDonutRevenueByYear.tsx:21-28`; contract status shown raw `contracts/all:197,232`, `contracts/[id]:56` | 5 + 3 raw | `lib/status.ts` (labels, badge variant, chart token per status) feeding `StatusBadge`, the status `Select`, and chart configs. Labels currently disagree: "Open" (badge, charts) vs "Sent/Open" (menus); "Partially Paid" vs "Partial". |
| INV-29b | Low | Selectable option cards | `contracts/templates/page.tsx:210-224`, `subscribe/page.tsx:131-148` (`role="button"` Card), `settings/subscriptions/page.tsx:168-224` | 3 | `RadioGroup` with card-style `RadioGroupItem`s. |
| INV-29c | Low | Download button with overlay spinner | `invoices/all:258-275`, `receipts:67-84` | 2 | `Button` with a `loading` prop (or `Spinner` + `disabled`). |
| INV-29d | Medium | Date/currency formatting helpers re-implemented inline | `dd-mm-yyyy` string slicing `invoices/all:209,217`, `receipts:62,63`; `toLocaleString(undefined, …)` `events/all:93-94`, `calendar:10-17`, `notification-feed:123-124`; `"en-US"` in `BookingsBarChart:62,69`, `RevenueChart:67,75`; currency `currencyToSymbol` `RevenueMetrics:18-29`, `£` literals `OverviewDonutRevenue:116`, `OverviewDonutRevenueByYear:107`, `RevenueChart:33`, `${currency} ${n.toFixed(2)}` `invoices/all:221`, `InvoiceForm:431`, `€` `subscriptions:193` | ~15 | `lib/format.ts` (`formatDate`, `formatDateTime`, `formatMoney` built on the existing `formatCurrency` in `packages/shared/src/index.ts:1`, which nothing in the UI uses yet). Detailed in `02-ux.md`. |

---

## 4. Forms

### 4.1 How forms are built today

| Form | File | Pattern | Validation | Submit failure | Notes |
|---|---|---|---|---|---|
| Customer | `components/customers/CustomerForm.tsx` | Uncontrolled, React 19 `<form action>` + `FormData` | HTML `required`, `type="email"` | `toast.error(saveErrorMessage)` | `readOnly` doubles as view mode |
| Venue | `components/venues/VenueForm.tsx` | Same as Customer | `required` on name | toast | |
| Trading details | `components/settings/TradingDetailsForm.tsx` | Same | `required` on name; contact email has no `type="email"` (line 72) | toast | |
| Bank account | `components/settings/BankAccountForm.tsx` | Same | `required` on name; currency is free text (line 81) | toast | |
| Event | `components/events/EventForm.tsx` | Controlled `useState` object, `onSubmit` + `preventDefault` | `required` on title only; customer/venue checked in the page (`events/create/page.tsx:25-28`); no end ≥ start check | toast | Past dates can't be picked (line 192) |
| Invoice | `components/invoices/InvoiceForm.tsx` | Hybrid: ~25 `useState`s, `<form action>`, hidden inputs mirroring state (lines 360-368) | None client-side | Toast; unique-number error mapped (lines 259-262) | 513 lines; business select has no `value` (line 277) |
| Contract | `components/contracts/ContractForm.tsx` | Controlled `useState` | None; event checked in page | Unhandled (fetch errors escape, `contracts/create/page.tsx:28`) | No pending state |
| Login / Signup | `components/login-form.tsx`, `signup-form.tsx` | `querySelector('#email')` on submit | HTML `required`; password match in JS | Raw Firebase error text | |
| Change email / reset password | `settings/general/page.tsx`, `login-form.tsx` | `useState` inside AlertDialog | `!newEmail` only | Status paragraph | INV-25 |
| Template create | `contracts/templates/page.tsx:127-159` | Controlled + `FormData` upload | Size check, PDF `accept` | toast | |

Labels are mostly wired with `htmlFor`, but every custom `Select` has an unassociated `<Label>` (it has no `id`), the invoice payment row labels are `sr-only` with no `htmlFor` (`InvoiceForm.tsx:389-409`), and invoice business/customer/venue fields are read-only `Input`s whose only label is a placeholder (`InvoiceForm.tsx:284-287, 344-355`). Errors are only ever shown as toasts; no field shows an inline message or `aria-invalid`.

### 4.2 Plan: shadcn Form (react-hook-form + zod)

Install `form` (pulls in `react-hook-form`, `@hookform/resolvers`, `zod`). Put each schema in `lib/schemas/<entity>.ts`, next to the existing payload builders, so the client schema mirrors the Firestore rules' field allow-lists and size limits (`firestore.rules` `reqString`/`optString`). Share the address and money sub-schemas.

| Form | Move to RHF + zod? | Why / notes | Order |
|---|---|---|---|
| Invoice | **Yes, first** | Biggest win: replaces 25 `useState`s and the hidden-input mirror, fixes the lost-notes bug (INV-A1), gives `useFieldArray` for payments, and validates amounts, dates and currency per row. Split into `InvoicePartiesSection`, `InvoicePaymentsSection`, `InvoiceOptionsSection`. | 1 |
| Event | Yes | Needs cross-field validation (end ≥ start), required customer/venue with inline errors, and a `Combobox` for long customer/venue lists. | 2 |
| Customer | Yes | Simple; establishes `AddressFields`. Email/URL validation. | 3 |
| Venue | Yes | Same shape as Customer. | 3 |
| Contract | Yes | `useFieldArray` for terms; required event; pending state to stop double "Generate" (costs a Firma call). | 4 |
| Trading details | Yes | Email validation for contact email; reuses `AddressFields`. | 5 |
| Bank account | Yes | Currency becomes a `Select` of supported codes; IBAN/sort-code format hints. | 5 |
| Login / Signup | Yes, light | Inline errors; map Firebase error codes to messages; password rules shown before submit. | 6 |
| Change email / reset password | Yes, light | Move into `Dialog` (INV-25). | 6 |
| Template create | No | One text field plus a file input; a `RadioGroup` for the starter is enough. | — |
| Analytics date filter | No | Not a submit form; keep controlled state. | — |

Two rules for the migration:

1. **Use `onSubmit` with `handleSubmit`, not `<form action>`.** React 19 resets uncontrolled forms when an `action` function settles, which is the root cause of INV-A2.
2. **Keep server payload builders as the authority.** Zod gives fast, inline feedback. The server routes and rules still validate, and the client must keep building payloads with `stripUndefined`.

---

## 5. Charts and analytics displays

Every chart already renders through shadcn's `ChartContainer` / `ChartTooltip` (Recharts 2). The work is tokens, consistency, states and two chart-type changes.

| ID | Display | File | Current build | Proposed shadcn chart | Issues |
|---|---|---|---|---|---|
| INV-35 | Revenue by status (donut) | `components/analytics/OverviewDonutRevenueByYear.tsx:91-121` | `PieChart` + `Pie` + centre `Label`, 6 hardcoded HSL colours | **Bar chart – Horizontal stacked** (one bar per measure, see below); Donut with Text only if a single donut is kept | Filename says "ByYear" but it groups by status, not year; help text (`lib/help.tsx:19-21`) promises a year comparison. Hardcoded `£`. No loading, empty or error state (an empty donut renders as nothing). |
| INV-36 | Outstanding revenue by status (donut) | `components/analytics/OverviewDonutRevenue.tsx:93-131` | Same as above, copy-pasted, same 6 colours | Fold into INV-35 as the second bar of one **Horizontal stacked** chart | Includes `void` and `draft` in "outstanding". 95% duplicate of INV-35: one `StatusDonut` component with a `mode` prop. |
| INV-37 | Gigs per month (radar) | `components/analytics/OverviewRadarGigs.tsx:67-84` | `RadarChart`, months ordered Dec→Nov, "Sept" label | **Bar chart – Default** (or Area) with months on the x-axis | A radar implies a cyclical comparison and hides trends; months from different years are summed together (line 57 keys on month name only). |
| INV-38 | Most bookings by customer | `components/analytics/OverviewTopCustomers.tsx:83-107` | Horizontal `BarChart` with 7 hardcoded blue shades, labels inside bars | **Bar chart – Horizontal / Custom Label** with a single token colour | Label colour is `--background` on a blue bar (fails contrast on short bars). Tooltip colour is invalid (INV-41). |
| INV-39 | Total revenue (paid vs pipeline over time) | `components/analytics/RevenueChart.tsx:36-125` | Stacked `AreaChart`, gradient fills, custom tooltip formatter, legend | **Area chart – Stacked (gradient)** | Good structure. `hsl(var(--chart-1))` and a hardcoded green for pipeline; `en-US` dates and `£` literal. |
| INV-40 | Bookings per week | `components/analytics/BookingsBarChart.tsx:25-86` | `BarChart`, hardcoded `#fcf300` | **Bar chart – Interactive/Default** | Yellow bars on a white background in light mode have poor contrast (~1.1:1 against white). `en-US` dates. |
| — | Revenue KPIs (4) | `components/analytics/RevenueMetrics.tsx` | Cards + `NumberTicker` | `StatCard` (INV-28) | `text-red-500` errors (line 100); `currencyToSymbol` duplicates `formatCurrency`. |
| — | Bookings KPIs (4) | `components/analytics/BookingsMetrics.tsx` | Cards + `NumberTicker` | `StatCard` (INV-28) | `text-red-500` (line 76). |
| — | Notification feed | `dashboard/_components/notification-feed.tsx` | Card + `<ul>` | Card + list + Skeleton + EmptyState | Not a chart; listed for completeness. |
| — | Calendar view | `events/calendar/page.tsx:150-200` | 4-month `Calendar` + injected `<style>` for event days + raw `<table>` | `Calendar` with `modifiers`/`modifiersClassNames` + `Table` | Detailed in `02-ux.md` (mobile breakage, injected CSS). |

| ID | Sev | File | Problem | Fix |
|---|---|---|---|---|
| INV-41 | Medium | `components/analytics/OverviewTopCustomers.tsx:21`, `app/globals.css:113` | `color: "var(--chart-2)"` resolves to `240 5.9% 10%`, which isn't a colour, so the tooltip indicator is blank. | Fixed by INV-04 (full-colour chart tokens). |
| INV-42 | Medium | `app/globals.css:126-132` | A global `[data-chart]` block defines `--color-bookings/paid/pipeline/count` "for BookingsChart", competing with `ChartContainer`'s per-chart `ChartStyle`. Confusing source of truth. | Delete the block; let each `ChartConfig` set colours from `--chart-N` tokens. |
| INV-43 | Medium | all 6 chart files | No shared chart card: each builds its own Card header, sizing (`h-[335px]` ×6, `max-h-[320px]` ×3, `max-h-[240px]`), skeleton and loading overlay. Overview charts have no skeleton, empty or error state at all. | `ChartCard` (title, description, `loading`, `empty`, `error`, `footer`) wrapping `ChartContainer`, with one height scale. |
| INV-44 | Medium | `OverviewDonutRevenue.tsx:56`, `OverviewDonutRevenueByYear.tsx:56`, `OverviewRadarGigs.tsx:47`, `OverviewTopCustomers.tsx:51`, `hooks/use-revenue-analytics-data.ts:105`, `hooks/use-bookings-analytics-data.ts:66` | **Every analytics view** queries by `ownerId` only, so it sums all of the user's businesses, while the Customers/Events/Venues lists are scoped to the active business. On Portfolio/Agency plans the dashboard numbers don't match the lists beside them. The four Overview charts also run four separate queries on every filter change. | **Confirmed: scope to the active business**, with an explicit "All businesses" option in the analytics header for multi-business plans. Add `businessId` to all six queries (or skip it only when "All businesses" is chosen), and move Overview into a `useOverviewAnalyticsData(filter, scope)` hook like the revenue and bookings hooks. Check the Firestore composite indexes for `ownerId` + `businessId` on `invoices` and `events` before shipping. |
| INV-45 | Low | `components/ui/number-ticker.tsx:30-53`; all 6 chart files (`animationDuration` 600–1200) | Motion is scattered and repeats: every stat value counts up from 0 on each filter change and every chart re-animates, regardless of `prefers-reduced-motion`. Counting up also makes the figure briefly wrong, which is a poor fit for money. | Show figures immediately. Keep chart animation only for the first render (or a short ≤300 ms transition between filter states), and turn it off under `prefers-reduced-motion`. `NumberTicker` can then be deleted. |

**Chart design, revised for §0.** Two donuts side by side ask people to compare angles across two circles, which is the hardest comparison a chart can ask for, and both show the same six statuses. A single horizontal **stacked bar** per measure ("all invoices" and "outstanding") puts both on one axis, labels each segment with its amount, and fits a phone width. The radar becomes a bar chart (INV-37). Keep Recharts' defaults quiet: no gradient fills unless the area overlaps, horizontal grid lines only, axis text in `muted-foreground` at 12px, figures in the mono.

Chart palette (maps onto §0.3 and §6):

| Token | Use |
|---|---|
| `--chart-1` | The default single-series colour: **foreground ink** (black in light mode, near-white in dark). Neutral by design, so the data rather than the colour carries the chart. |
| `--chart-2` | Signal yellow, used for **one** highlight only: the current week/month bar, or the "paid" series on dark. Never the fill for every bar on a white background (≈1.1:1, INV-40). |
| `--chart-3` | A second series where two are compared (e.g. pipeline vs paid): mid-grey. |
| `--chart-4`, `--chart-5` | Reserved; add only when a chart genuinely needs more series. |
| `--status-*` | Invoice status segments: draft/void grey, sent blue, partial teal, paid green, overdue red (§0.3). |

Status colours come from `lib/status.ts` (INV-29), so the badge, bar segment and legend for "Overdue" are the same colour. A legend or direct label must always name the series. Colour is never the only cue.

---

## 6. Design tokens in practice

### 6.1 Colour

The theme defines shadcn variables in `app/globals.css:41-99`, with the brand yellow set as `--primary`, `--accent`, `--ring` and `--sidebar-primary/accent/ring` in both themes.

| ID | Sev | Finding | Where | Proposal |
|---|---|---|---|---|
| INV-30 | Medium | **Brand yellow has six spellings**: `#fcf300` (theme, charts), `#fcf400` (subscriptions, button `brand`), `#FCF400` (auth pages), `rgb(252, 244, 0)` (map marker), `#facc15` (Tailwind yellow-400, toast success), `48 100% 49%` (`--chart-1`, ≈ `#fac800`, visibly more orange), plus `#fff866` (button hover). | `globals.css:49,55,61,64,66,69,112,131`; `settings/subscriptions/page.tsx:138,177,181,183,188,203`; `login/page.tsx:23`; `signup/page.tsx:26`; `MapboxMap.tsx:41`; `sonner.tsx:19`; `BookingsBarChart.tsx:16`; `OverviewRadarGigs.tsx:21`; `packages/ui/src/components/button.tsx:13,19` | One `--brand` (`oklch` equivalent of `#fcf300`) referenced by `--primary`, `--ring`, `--sidebar-primary`, `--chart-1`. Replace every literal with `bg-primary`/`text-primary`/`ring-primary`, or `var(--primary)` where JS needs a value (map marker: read the CSS variable at runtime). |
| INV-31 | Medium | **`--accent` and `--sidebar-accent` are the brand yellow.** shadcn uses `accent` for the focus/hover background of every dropdown item (`dropdown-menu.tsx:77,95,131,214`), ghost and outline buttons, calendar range days (`calendar.tsx:107,111`) and `Skeleton` (`skeleton.tsx:7`). `sidebar-accent` drives every sidebar row hover (`sidebar.tsx:429,481,564`). Moving the pointer down a menu or the sidebar paints a run of bright yellow blocks, skeletons pulse yellow, and yellow stops meaning "act here" (§0.2). | `globals.css:55,66,85,95`; files above | `--accent`: neutral (`oklch(0.97 0 0)` light, Graphite + 4% white dark). `--sidebar-accent`: the same neutral for hover. Show the **active** nav item with `--sidebar-primary` (yellow) through `isActive`, which `nav-main.tsx:79` already sets. Yellow stays on `--primary`, `--sidebar-primary` and (dark) `--ring`. |
| INV-32 | Medium | **Yellow focus ring on white.** `--ring: #fcf300` gives a focus ring of ≈1.1:1 against the light background, below the 3:1 WCAG non-text contrast minimum. | `globals.css:61` | Light mode: a darker ring (e.g. `oklch(0.45 0 0)` or a dark-olive brand shade). Dark mode can keep yellow. |
| INV-33 | Low | Hardcoded status colours in `StatusBadge` (`bg-gray-600`, `bg-blue-500`, `bg-green-600`, `bg-amber-500` + `dark:` variants), donut configs (6 HSL values ×2), top-customers blues (7 HSL values), revenue pipeline green, `text-red-500` errors, `text-green-600` success, `text-black` tutorial icons ×8. | `StatusBadge.tsx:7-12`, `OverviewDonut*.tsx:22-28`, `OverviewTopCustomers.tsx:37-45`, `RevenueChart.tsx:24`, `RevenueMetrics.tsx:100`, `BookingsMetrics.tsx:76`, `signup-form.tsx:66`, `tutorial/page.tsx:37-61,169` | Add `--status-draft/sent/partial/paid/void` tokens (overdue reuses `--destructive`) per §0.3, expose them in `@theme inline`, and drive `StatusBadge` and chart configs from them (INV-53). Errors use `text-destructive`. Tutorial icons use `text-foreground`; yellow is not spent on decorative icons (§0.2). |
| INV-34 | Low | Sidebar tokens mix `hsl()` and `oklch()`; `--border`/`--input` were darkened by hand (`0.86` vs shadcn's `0.922`), and `--sidebar-border` is darker still (`hsl(220 13% 80%)`). | `globals.css:58-68` | Convert all to `oklch`. Keep the deliberate darker border as one value shared by `--border`, `--input` and `--sidebar-border` (Rule, §0.3). |
| INV-50 | Low | **The dark logo sits in a visible box.** `darklonglogo.svg` is drawn on a solid `#000` rectangle, and the dark background is `≈ #0a0a0a`, so a slightly blacker box shows behind the wordmark in the header. | `public/assets/darklonglogo.svg` (`<rect … fill="black"/>`), `(app)/layout.tsx:129`, `globals.css:73` | Either make the dark background true black (§0.3, preferred) or export the logo with a transparent background. Also consider moving the wordmark into the sidebar header: it currently sits top-right on every page next to the theme toggle, competing with the page title. |
| INV-51 | Low | Sidebar `outline` button variant wraps an already-complete colour in `hsl()`: `hsl(var(--sidebar-border))` becomes `hsl(hsl(220 13% 80%))`, which is invalid, so the outline would vanish. Unused today. | `components/ui/sidebar.tsx:483` | Regenerating `sidebar` from the v4 registry fixes it (`var(--sidebar-border)`). |
| INV-52 | Medium | **Marketing and app use different primaries.** Marketing's `--primary` and `--accent-foreground` are red (`oklch(0.577 0.245 27.325)`, the shadcn destructive red), The app's primary is yellow. Moving from the landing page into the product changes the brand colour. (Type is resolved by INV-46: both apps will use Inter.) | `apps/marketing/src/app/globals.css:123,130,166,173,205-213`, `apps/marketing/src/app/layout.tsx:26-27` | Out of scope for `apps/app`, but the Stage A tokens should be written so marketing can adopt them: put the brand tokens (§0.3) in one shared CSS file both apps import, or at least record them in `packages/ui`. |
| INV-53 | Medium | **Status badges are saturated filled pills** (`bg-blue-500 text-white`, `bg-green-600 text-white`, …). In a 10-row invoice table they dominate the row and compete with the yellow primary. "Partially paid" is amber, next to the brand yellow. | `components/ui/StatusBadge.tsx:7-12`, used at `invoices/all/page.tsx:233` | `StatusBadge` as a small coloured dot plus a text label in `foreground`, on a transparent or 10% tint background, driven by `--status-*` tokens. Overdue may use the stronger filled style because it needs attention. Partially paid moves to teal (§0.3). |
| INV-54 | Medium | **Cards nested in cards.** Each entity form wraps its fields in a `Card` (`CustomerForm.tsx:77`, `VenueForm.tsx:73`, `EventForm.tsx:85`, `TradingDetailsForm.tsx:57`, `BankAccountForm.tsx:54`, `InvoiceForm.tsx:272,373,440`, `ContractForm.tsx:80,97,124`), and the list and settings pages put those forms inside another `Card` (`customers/all:365`, `events/all:289`, `venues/all:438`, `trading-details:150`, `bank-accounts:84`). That gives two borders and two paddings around every edit form. | files listed | Forms render bare `FormSection`s; the container (Sheet, page or Dialog) provides the only frame. |

### 6.2 Typography

No font is loaded (INV-46). Sizes in use outside `components/ui/`:

| Class | Uses | Role today | Proposed role |
|---|---|---|---|
| `text-3xl` | 5 | KPI values, plan price, donut centre | Stat value |
| `text-2xl` | 36 | Every `<h1>` (+ auth titles) | Page title (`PageHeader`) |
| `text-xl` | 11 | `CardTitle` overrides on detail/settings cards | Remove; use `CardTitle` default |
| `text-lg` | 2 | Calendar day heading, auth-guard title | Section title (`h2`) |
| `text-base` | 1 | — | Body (default) |
| `text-sm` | 91 | Body copy, descriptions | Body small / UI text |
| `text-xs` | 28 | Captions, metadata, badges | Caption |

Weights: `font-semibold` 40, `font-medium` 36, `font-bold` 5 (auth titles and stat values, versus `font-semibold` everywhere else), `font-normal` 4.

| ID | Sev | Finding | Fix |
|---|---|---|---|
| INV-46 | Medium | No font is loaded, so text renders in each OS's system sans and the app looks different on macOS, Windows and Android. Marketing uses Inter with character variants (`apps/marketing/src/app/globals.css:205-213`, loaded from `rsms.me` in `apps/marketing/src/app/layout.tsx:26-27`), so moving from the site into the product changes the type. | **Confirmed: Inter.** Load it with `next/font/google` (variable, latin subset) in `app/layout.tsx`, expose it as `--font-sans` in `@theme inline`, and set the same features as marketing on `body` (`"cv02", "cv03", "cv04", "cv11", "salt"`). Apply the §0.3 scale through `PageHeader`, `StatStrip` and `DataTable`, with `tabular-nums` on every figure. `next/font` self-hosts, so the app CSP (`font-src 'self'`) needs no change; don't copy marketing's `rsms.me` stylesheet, which the app CSP would block. |
| INV-47 | Low | Page titles are `font-semibold` in-app but `font-bold` on login/signup (`login-form.tsx:38`, `signup-form.tsx:59`); `CardTitle` is overridden to `text-xl` in 10 places (e.g. `customers/all:367`, `settings/billing:23`) and to `text-sm font-medium` in 8 (`RevenueMetrics.tsx`, `BookingsMetrics.tsx`). | Fix through `PageHeader`, `StatStrip` and the default `CardTitle`, using the §0.3 scale. |
| INV-55 | Low | **Copy and labelling habits** that make the UI read as templated, or say how it's built rather than what it does: `·`-joined meta strings (`BookingsBarChart.tsx:37`, `RevenueChart.tsx:41` "… · paid, pipeline", `notification-feed.tsx:50,60,104`, `InvoiceForm.tsx:115`, `ContractForm.tsx:52`); an `uppercase tracking-wide` group label (`select.tsx:98`); "Toggle Date Filter" as a switch label (`date-time-filter.tsx:52`); "Send a verification email via Firebase" (`settings/general/page.tsx:75,134`); trailing spaces in chart labels "Paid revenue " (`RevenueChart.tsx:23-24`); "Let’s go" / "Got it" as button text (`(app)/layout.tsx:148`, `tutorial/page.tsx:118,145`); one status called "Sent/Open" in menus and "Open" on the badge (`invoices/all:240`, `InvoiceForm.tsx:295`, `StatusBadge.tsx:8`). | Sentence case; separate labelled fields instead of `·`; the switch becomes a "Preset / Custom" toggle; no vendor names in user copy ("We'll email you a link to confirm the new address"); buttons name the action ("Start the tour", "Close"); one name per status. Full terminology pass in `02-ux.md`. |
| INV-56 | Medium | **Numbers aren't set as numbers in tables.** Amounts are left-aligned and rendered as `GBP 120.00` (`invoices/all:221`); dates are `dd-mm-yyyy` strings in some tables (`invoices/all:209`) and locale-dependent `toLocaleString` in others (`events/all:93`). Columns of figures don't line up, so totals are hard to scan. | `DataTable` column `meta.align: "right"` for money and counts; values formatted by `lib/format.ts` (INV-29d) and set in `tabular-nums`; one date format across the app (e.g. `14 Nov 2026`, plus `19:30` where time matters). |

### 6.3 Spacing and layout

The layout shell pads content `px-4 md:px-6 pb-8 pt-2` (`(app)/layout.tsx:134`), and then **30 pages add their own `p-1`** wrapper. Vertical rhythm after the `<h1>` is `mb-4` (12 pages), `mb-6` (13 pages) or none (analytics, templates, `[id]`). Cards in grids use `gap-2.5`, `gap-3` and `gap-4` for the same job (`RevenueMetrics:88`, `overview/page.tsx:35`, `trading-details:43`). Spacer divs `<div className="h-6" />` separate cards on `settings/general:69,128`.

| ID | Sev | Finding | Fix |
|---|---|---|---|
| INV-48 | Low | Per-page `p-1`, mixed `mb-4`/`mb-6`, spacer divs, mixed grid gaps. | `PageHeader` owns the title spacing; a `PageBody` (or the layout) owns `gap-6` between sections; grids use `gap-4`. Remove `p-1` wrappers. |
| INV-49 | Low | Fixed pixel sizes: `w-[280px]`, `h-11` (filter controls, taller than every other control at `h-9`), `rounded-xl`/`rounded-2xl` on filter controls, `min-w-[110px]`, `h-[335px]`, `h-[420px]`, `h-[72vh]`. | Use standard control height (`h-9`) and radius (`rounded-md`) for filters; responsive widths (`w-full sm:w-[280px]`); a chart height scale in `ChartCard`. |

### 6.4 Radius and shadow

`--radius: 0.625rem` (shadcn default). In use: `rounded-md` 19, `rounded-xl` 12, `rounded-lg` 12, `rounded-full` 5, `rounded` 3, `rounded-2xl` 1, `rounded-[2px]` 1. `ContentPanel` (`rounded-xl`) and plan cards (`rounded-xl`) restate Card; filter controls use `rounded-xl` while all other controls are `rounded-md`; the map uses an inline `borderRadius: 8` (`MapboxMap.tsx:56`). Shadows: only `shadow-sm` (Card) and `shadow-md` ×2 (popovers re-stating the Popover default, `EventForm.tsx:185`, `InvoiceForm.tsx:493`).

Proposal: keep `--radius` and the shadcn scale (`rounded-sm/md/lg/xl` = radius −4/−2/0/+4 px). Controls use `rounded-md`, cards `rounded-xl` (Card's default), and nothing else is set by hand. Drop the redundant `shadow-md`/`bg-popover border rounded-md` overrides on `PopoverContent`.

### 6.5 Dark mode

Supported and the default (`app/layout.tsx:20,22`: `className="dark"` on `<html>` plus `defaultTheme="dark"`). Dark tokens exist for every variable. Gaps:

- The hardcoded `className="dark"` on `<html>` means light-mode users see a dark flash before `next-themes` hydrates. `next-themes` already injects the class; drop it from `<html>` and keep `suppressHydrationWarning`.
- `FirmaTemplateEditor.tsx:84` forces `theme: "dark"`; `sonner.tsx` success colours are fixed.
- Light mode is the weaker theme (yellow focus ring and yellow chart bars on white, INV-32, INV-40). Every Stage B page should be checked in both themes.

| ID | Sev | Finding | Fix |
|---|---|---|---|
| INV-57 | Low | The venue map always uses Mapbox `streets-v12` (`MapboxMap.tsx:34`), a bright light map that sits in a dark page by default. The marker is a hardcoded yellow (`MapboxMap.tsx:41`). | Pick `dark-v11` / `light-v11` from `resolvedTheme`, and read the marker colour from `--primary`. |
| INV-58 | Low | Sonner's success toast is hardcoded yellow-400 with black text (`sonner.tsx:18-21`). Under §0.2, a success confirmation isn't the "act here" signal. | Neutral toast surface with a green `--status-paid`-style icon for success and `--destructive` for errors. Yellow is not used in toasts. |

### 6.6 Target token map

| shadcn variable | Light | Dark | Notes |
|---|---|---|---|
| `--brand` | Signal yellow `#FCF300` (as oklch) | same | new; single source for every yellow (INV-30) |
| `--background` / `--foreground` | Paper `#FFF` / Stage black `#000` | Stage black `#000` / `oklch(0.985 0 0)` | **dark changed** to true black (INV-50) |
| `--card`, `--popover` (+fg) | as background | Graphite `#161616` | **dark changed** |
| `--primary` / `--primary-foreground` | `var(--brand)` / `#000` | same | |
| `--secondary`, `--muted` | shadcn neutral | shadcn neutral | unchanged |
| `--muted-foreground` | Concrete `#5C5C5C` | Concrete `#8A8A8A` | **changed** for contrast margin |
| `--accent` / `--accent-foreground` | `oklch(0.97 0 0)` / `#000` | Graphite + 4% white / `oklch(0.985 0 0)` | **changed** from yellow (INV-31) |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | unchanged; doubles as `--status-overdue` |
| `--status-draft/sent/partial/paid/void` | grey / blue / teal / green / grey | tuned for dark | new (INV-33, INV-53); replaces the generic success/warning/info idea, so no amber |
| `--border`, `--input`, `--sidebar-border` | Rule `#D6D6D6` | Rule `#2A2A2A` | one value (INV-34) |
| `--ring` | `#000` (2px, offset) | `var(--brand)` | **changed** in light (INV-32) |
| `--radius` | `0.375rem` (6px) | — | **changed**, confirmed (§0.3) |
| `--chart-1…3` | ink / brand / mid-grey per §5 | tuned for dark | INV-04 |
| `--sidebar-accent` | as `--accent` | as `--accent` | **changed** from yellow (INV-31); active item uses `--sidebar-primary` |
| `--font-sans` | Inter (`next/font`), features cv02/cv03/cv04/cv11/salt | — | **new**, confirmed (INV-46) |

---

## 7. shadcn components the app will need

**Already present, regenerate/keep (25):** `alert-dialog`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `chart`, `checkbox`, `collapsible`, `dropdown-menu`, `input`, `label`, `pagination`, `popover`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`, `spinner`, `switch`, `table`, `textarea`, `tooltip`.

**Install (9):**

| Component | Needed for |
|---|---|
| `select` | Status, currency, bank account, business, language, date-filter mode, preset ranges (replaces custom select, INV-03) |
| `command` | Dependency of `combobox` |
| `combobox` (recipe: Popover + Command) | Customer, venue and event pickers in Event/Invoice/Contract forms, which grow unbounded |
| `form` | All entity forms (§4); installs `react-hook-form`, `@hookform/resolvers`, `zod` |
| `dialog` | Change email, reset password, any create-in-place flows (INV-25) |
| `drawer` | Mobile version of record sheets and dialogs (responsive pattern) |
| `radio-group` | Plan picker, contract template picker (INV-29b) |
| `toggle-group` | Preset/custom date filter, monthly/yearly billing toggle (`settings/subscriptions/page.tsx:145-164`) |
| `alert` | Inline error/warning banners (e.g. "Workspace API key is missing", `contracts/templates/page.tsx:189`; subscribe check failures) |

**Optional, decide in Stage A:** `tabs` (already present; for a combined Settings page), `scroll-area` (long select lists), `hover-card` (none needed today). Not needed: `accordion`, `carousel`, `navigation-menu`, `menubar`, `context-menu`, `slider`, `input-otp`, `resizable`, `toggle` (covered by `toggle-group`).

**App-level components to build on top (Stage A):** `PageHeader`, `EmptyState`, `DataTable` (+ `DataTableToolbar`, `DataTableColumnHeader`, `DataTableViewOptions`, `DataTablePagination`), `RecordSheet`, `ConfirmDeleteDialog`, `StatStrip`, `ChartCard`, `NextBookingPanel` and `OwedSummary` (Overview, §0.4), `StatusBadge` (rebuilt as dot + label), `DatePicker`/`DateTimePicker`, `AddressFields`, `FormSection`, `BusinessLimitDialog`, `FullPageLoader`, plus `lib/format.ts`, `lib/status.ts`, `lib/plans.ts`.

---

## Appendix: defects spotted during the inventory

These aren't inventory items, but they are real bugs. Each is written up fully in `02-ux.md`; the IDs below are reused there.

| ID | Sev | File | Problem | Suggested fix |
|---|---|---|---|---|
| INV-A1 | High | `components/invoices/InvoiceForm.tsx:467` | The notes `Textarea` has no `defaultValue`, so opening an invoice for editing shows empty notes and **saving any edit erases the invoice's notes**. Notes are also dropped when the "Notes" switch is off, because disabled fields aren't submitted (lines 444, 467). | Seed from `initial?.notes`; with RHF this is automatic. Keep notes in state regardless of the include toggle. |
| INV-A2 | High (verify in browser) | `CustomerForm.tsx:47-76`, `VenueForm.tsx:45-72`, `TradingDetailsForm.tsx:35-56`, `BankAccountForm.tsx:35-53`, `InvoiceForm.tsx:202-270` | These forms pass a function to `<form action>` but don't return the save promise. React 19 resets uncontrolled forms when the action settles, which here is **immediately**, so a save that then fails leaves the user with a cleared form and an error toast. | Use `onSubmit` + `preventDefault` (or RHF `handleSubmit`), and reset only on success. |
| INV-A3 | High | `app/(app)/invoices/receipts/page.tsx:28,92,144-157` | The receipts table uses TanStack pagination (10 rows) but the pager is static (`pageIndex` is a constant, prev/next have `pointer-events-none`). **Receipts after the 10th are unreachable.** The page also isn't linked from the sidebar (`lib/nav.ts:63-71`). | `DataTable` with working pagination; add "Receipts" to the Invoices nav group. |
| INV-A4 | Medium (security) | `components/MapboxMap.tsx:43-45`, `app/(app)/venues/all/page.tsx:419-429` | The marker popup is built with `setHTML` from the venue name and address, which are user-entered. A venue named `<img src=x onerror=…>` runs script when its map popup opens. Venues are owner-scoped so today this is self-XSS, but it is still script injection in the app origin. | Build the popup with DOM nodes and `textContent` (or `setText`). Flag in `audit/STATUS.md` as a security item. |
