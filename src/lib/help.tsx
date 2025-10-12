import * as React from "react"

// Central help/guide content mapped by route path.
// Keys should match entries in `navMain` (section and submenu urls).
export const helpByPath: Record<string, React.ReactNode> = {
  "/dashboard/overview": (
    <>
      Overview shows quick stats and shortcuts to common actions.
    </>
  ),
  "/dashboard/analytics": (
    <>Explore high-level analytics for your business.</>
  ),
  "/analytics/revenue": (
    <>Revenue analytics by period to understand performance.</>
  ),
  "/analytics/bookings": (
    <>Bookings analytics across time and segments.</>
  ),
  "/events/all": (
    <>List and manage all events. Click a row to view or edit details.</>
  ),
  "/events/create": (
    <>Create a new event and assign a customer and venue.</>
  ),
  "/events/calendar": (
    <>Use the calendar to view events. Yellow days indicate dates with events. Click a day for details.</>
  ),
  "/customers/all": (
    <>Your customer directory. Filter and manage contacts.</>
  ),
  "/customers/create": (
    <>Add a new customer with contact and address details.</>
  ),
  "/venues/all": (
    <>All venues in your account. Manage locations and details.</>
  ),
  "/venues/create": (
    <>Create a new venue with address and capacity details.</>
  ),
  "/invoices/all": (
    <>Browse and manage invoices you&apos;ve issued.</>
  ),
  "/invoices/create": (
    <>Create an invoice. Use multiple payments for staged billing.</>
  ),
  "/contracts/all": (
    <>See all contracts and track their status.</>
  ),
  "/contracts/create": (
    <>Create a new contract.</>
  ),
  "/settings/general": (
    <>Update general workspace preferences.</>
  ),
  "/settings/team": (
    <>Invite teammates and manage roles.</>
  ),
  "/settings/billing": (
    <>Manage your subscription and payment methods.</>
  ),
  "/settings/limits": (
    <>Configure usage limits as needed.</>
  ),
  "/settings/trading-details": (
    <>Create and manage multiple business trading details to reuse across invoices and contracts.</>
  ),
  "/settings/bank-accounts": (
    <>Store multiple bank accounts to select on invoices and payment instructions.</>
  ),
}


