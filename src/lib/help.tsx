import * as React from "react"

// Central help/guide content mapped by route path.
// Keys should match entries in `navMain` (section and submenu urls).
export const helpByPath: Record<string, React.ReactNode> = {
  "/dashboard": (
    <>
      <p className="mb-2">Your home area for quick navigation and recent information.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Use the sidebar to move between operations and analytics.</li>
        <li>The header menu lets you toggle theme and collapse the sidebar.</li>
      </ul>
    </>
  ),
  "/dashboard/overview": (
    <>
      <p className="mb-2">Overview shows snapshot metrics and shortcuts.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Revenue by status donut — view paid/open/overdue mix. Toggle year vs YTD.</li>
        <li>Gigs per month — yearly radar of events.</li>
        <li>Bookings by weekday — spot weekly demand patterns.</li>
        <li>Top customers — most bookings leaderboard.</li>
        <li>Notification feed — next 5 upcoming items with quick Open buttons.</li>
      </ul>
    </>
  ),
  "/dashboard/notifications": (
    <>
      <p className="mb-2">Chronological list of upcoming items.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Shows events, invoice payments/due dates, and contracts due.</li>
        <li>Click <strong>Open</strong> to jump to the relevant section.</li>
        <li>Items are generated from your Events, Invoices (payments) and Contracts collections.</li>
      </ul>
    </>
  ),
  "/dashboard/analytics": (
    <>
      <p className="mb-2">Explore high‑level analytics to plan revenue and bookings.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Use subpages for detailed charts: Revenue and Bookings.</li>
        <li>Most charts allow toggling between the full year and YTD.</li>
      </ul>
    </>
  ),
  "/analytics/revenue": (
    <>
      <p className="mb-2">Forecast and track revenue by month and status.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Metrics cards — paid total, pipeline, due next 4 weeks, overdue.</li>
        <li>Area chart — paid vs pipeline with tooltip values (£).</li>
        <li>Toggle the range (3, 6, 12 months) to explore.</li>
      </ul>
    </>
  ),
  "/analytics/bookings": (
    <>
      <p className="mb-2">Understand booking volume and seasonality.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Bar chart — bookings per week with adjustable future window.</li>
        <li>Use filters to compare different horizons.</li>
      </ul>
    </>
  ),
  "/events": (
    <>
      <p className="mb-2">Events module for scheduling gigs.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>All Events</strong> — list, select a row to edit or delete.</li>
        <li><strong>Create Event</strong> — add title, dates, customer, venue, notes.</li>
        <li><strong>Calendar View</strong> — monthly overview; click a day to inspect.</li>
      </ul>
    </>
  ),
  "/events/all": (
    <>
      <p className="mb-2">List and manage all events.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Click a row to open the details panel.</li>
        <li>Edit, save, or delete from the panel; pagination is supported.</li>
      </ul>
    </>
  ),
  "/events/create": (
    <>
      <p className="mb-2">Create a new gig.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Required: title, start/end; optional: customer, venue, notes.</li>
        <li>Save to add it to listings and analytics.</li>
      </ul>
    </>
  ),
  "/events/calendar": (
    <>
      <p className="mb-2">Monthly calendar view.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Highlighted days indicate scheduled events.</li>
        <li>Click a day to drill into the events list.</li>
      </ul>
    </>
  ),
  "/customers": (
    <>
      <p className="mb-2">Manage your customer directory.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>All Customers</strong> — filter, paginate, and open details.</li>
        <li><strong>Create Customer</strong> — add contact and company info.</li>
      </ul>
    </>
  ),
  "/customers/all": (
    <>
      <p className="mb-2">Your customer directory.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Filter by name or contact, open a record to edit.</li>
        <li>Use pagination to navigate large lists.</li>
      </ul>
    </>
  ),
  "/customers/create": (
    <>
      <p className="mb-2">Add a new customer.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Enter company name and optional contact details.</li>
        <li>Save to link with events, invoices, and contracts.</li>
      </ul>
    </>
  ),
  "/venues": (
    <>
      <p className="mb-2">Create and manage venue locations.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Keep address and contact details for quicker event setup.</li>
      </ul>
    </>
  ),
  "/venues/all": (
    <>
      <p className="mb-2">All venues in your account.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Filter and open a venue to edit details.</li>
      </ul>
    </>
  ),
  "/venues/create": (
    <>
      <p className="mb-2">Create a new venue.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Enter name, address and optional capacity/contact info.</li>
      </ul>
    </>
  ),
  "/invoices": (
    <>
      <p className="mb-2">Issue and track invoices and payments.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>All Invoices</strong> — manage and update status.</li>
        <li><strong>Create Invoice</strong> — line items, staged payments, PDF.</li>
      </ul>
    </>
  ),
  "/invoices/all": (
    <>
      <p className="mb-2">Browse and manage invoices you’ve issued.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Filter by invoice number; paginate through results.</li>
        <li>Click a row to view details, edit fields, or delete.</li>
        <li>Use the Download button to generate a PDF with your settings.</li>
      </ul>
    </>
  ),
  "/invoices/create": (
    <>
      <p className="mb-2">Create an invoice.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Add line items or define staged <em>payments</em> (recommended).</li>
        <li>Attach bank account, notes, and a payment link if needed.</li>
        <li>Save, then download a PDF from the All Invoices page.</li>
      </ul>
    </>
  ),
  "/invoices/receipts": (
    <>
      <p className="mb-2">Generate a receipt for a paid invoice.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Open an invoice, mark it paid, then use the receipt action.</li>
      </ul>
    </>
  ),
  "/contracts": (
    <>
      <p className="mb-2">Manage performance contracts.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Draft, send, and track status for each contract.</li>
      </ul>
    </>
  ),
  "/contracts/all": (
    <>
      <p className="mb-2">See all contracts and track their status.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Open a contract to review, edit or resend.</li>
      </ul>
    </>
  ),
  "/contracts/create": (
    <>
      <p className="mb-2">Create a new contract.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Choose a template and fill in parties, dates and fees.</li>
      </ul>
    </>
  ),
  "/settings": (
    <>
      <p className="mb-2">Workspace configuration.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>General preferences, team, billing, limits and trading details.</li>
      </ul>
    </>
  ),
  "/settings/general": (
    <>
      <p className="mb-2">General workspace preferences.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Theme, locale and basic defaults.</li>
      </ul>
    </>
  ),
  "/settings/team": (
    <>
      <p className="mb-2">Invite teammates and manage roles.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Invite by email, set roles, and remove access when needed.</li>
      </ul>
    </>
  ),
  "/settings/billing": (
    <>
      <p className="mb-2">Manage your subscription and payment methods.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Update plan, change card, and access the customer portal.</li>
      </ul>
    </>
  ),
  "/settings/subscriptions": (
    <>
      <p className="mb-2">Manage your Indie Suite subscription.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Choose plan</strong> — switch between Pro tiers. Clicking a plan
          opens Stripe Checkout to confirm the change.
        </li>
        <li>
          <strong>Trialing/current plan</strong> — the banner shows your present
          status. Upgrades apply immediately; downgrades take effect at the next
          billing cycle.
        </li>
        <li>
          <strong>Cancel in Stripe</strong> — opens the Stripe customer portal
          where you can cancel, update payment method, or view invoices.
        </li>
        <li>
          Need help? Reach out via support and include your account email so we
          can look up your subscription.
        </li>
      </ul>
    </>
  ),
  "/settings/limits": (
    <>
      <p className="mb-2">Configure usage limits.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Review current plan limits and guardrails.</li>
      </ul>
    </>
  ),
  "/settings/trading-details": (
    <>
      <p className="mb-2">Trading details used on invoices and contracts.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Create multiple profiles (e.g., sole trader vs. company).</li>
        <li>Choose a default profile and switch per document.</li>
      </ul>
    </>
  ),
  "/settings/bank-accounts": (
    <>
      <p className="mb-2">Bank accounts for payment instructions.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Add and label accounts; pick per invoice when generating PDFs.</li>
      </ul>
    </>
  ),
}


