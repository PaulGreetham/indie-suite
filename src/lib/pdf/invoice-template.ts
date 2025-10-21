import Handlebars from "handlebars"

// Base HTML template for invoice PDF rendering (branded to app style)
const baseTemplate = `<!doctype html>
<html><head><meta charset=\"utf-8\" />
<style>
  /* Match app theme colors (see globals.css) */
  :root { --brand: #fcf300; --border: #e5e7eb; --muted: #6b7280; --ink: #111; --bg: #ffffff; }
  @font-face { font-family: Inter; font-weight: 400; src: local('Inter'); }
  body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size: 12px; color: var(--ink); background: var(--bg); }
  h1 { font-size: 22px; margin: 0 0 10px; font-weight: 700; letter-spacing: .2px; }
  h2 { font-size: 13px; margin: 0 0 8px; font-weight: 700; letter-spacing: .2px; color: var(--ink); }
  a { color: var(--ink); text-decoration: underline; }
  .banner { background: var(--brand); }
  .banner-inner { max-width: 820px; margin: 0 auto; padding: 14px 22px; display:flex; align-items:center; justify-content: space-between; }
  .brand { font-weight: 800; font-size: 18px; letter-spacing: .2px; }
  .pill { padding: 3px 10px; border-radius: 999px; background: var(--ink); color:#fff; font-size:11px; font-weight:700 }
  .container { max-width: 820px; margin: 0 auto; padding: 22px; }
  .row { display:flex; justify-content: space-between; align-items: center; margin: 6px 0; gap: 16px; }
  .muted { color: var(--muted); }
  .small { font-size: 11px; }
  .card { border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; background: #fff; }
  .grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px }
  .header-grid { display:grid; grid-template-columns: 2fr 1fr; gap: 16px; align-items: start; }
  .divider { height: 2px; background: #f3f4f6; border-radius: 2px; margin: 14px 0; }
  table { width:100%; border-collapse: collapse; margin-top: 8px; }
  thead th { background: #f9fafb; font-weight: 600; color:#374151; border-bottom: 1px solid var(--border); padding: 10px 8px; text-align: left; }
  tbody td { border-bottom: 1px solid var(--border); padding: 10px 8px; text-align: left; }
  tbody tr:nth-child(odd) td { background:#fcfcfd }
  .amount-due { font-size: 18px; font-weight: 800; text-align: right; }
  .section-title { text-transform: uppercase; letter-spacing: .4px; font-size: 10px; color: var(--muted); margin-bottom: 6px; }
  .footer { margin-top: 18px; font-size: 11px; color: var(--muted) }
</style>
</head><body>
  <div class=\"banner\"><div class=\"banner-inner\">
    <div class=\"brand\">{{user_business_name}}</div>
    <div class=\"pill\">INVOICE</div>
  </div></div>
  <div class=\"container\">
    <div class=\"header-grid\">
      <div>
        <h1>Invoice #{{invoice_number}}</h1>
        <div class=\"row small\"><div class=\"muted\">Issue</div><div>{{issue_date}}</div></div>
        <div class=\"row small\"><div class=\"muted\">Due</div><div>{{due_date}}</div></div>
      </div>
      <div class=\"card\">
        <div class=\"muted small\">Amount Due</div>
        <div class=\"amount-due\">{{totalFormatted}}</div>
        {{#if status}}
          <div class=\"row small\" style=\"margin-top:6px\"><div class=\"muted\">Status</div><div style=\"font-weight:600\">{{status}}</div></div>
        {{/if}}
      </div>
    </div>

    <div class=\"divider\"></div>

    <div class=\"grid\">
      <div class=\"card\">
        <div class=\"section-title\">Bill To</div>
        <div style=\"font-weight:600\">{{customer_name}}</div>
        {{#if customer_contact_name}}<div>{{customer_contact_name}}</div>{{/if}}
        {{#if customer_email}}<div>{{customer_email}}</div>{{/if}}
        {{#if customer_phone}}<div>{{customer_phone}}</div>{{/if}}
        {{#if venue_name}}
          <div class=\"section-title\" style=\"margin-top:8px\">Venue</div>
          <div>{{venue_name}}</div>
          <div>{{venue_city}} {{venue_postcode}}</div>
          {{#if venue_phone}}<div>{{venue_phone}}</div>{{/if}}
        {{/if}}
      </div>
      <div class=\"card\">
        <div class=\"section-title\">Details</div>
        <div class=\"row\"><div class=\"muted\">From</div><div>{{user_business_name}}</div></div>
        {{#if user_email}}<div class=\"row\"><div class=\"muted\">Email</div><div>{{user_email}}</div></div>{{/if}}
      </div>
    </div>

    <table style=\"margin-top:16px\">
      <thead><tr><th>Description</th><th style=\"width:140px; text-align:right\">Amount</th></tr></thead>
      <tbody>
        {{#each payments}}
          <tr><td>{{this.desc}}</td><td style=\"text-align:right\">{{this.amountFormatted}}</td></tr>
        {{/each}}
      </tbody>
    </table>

    {{#if notes}}
      <div class=\"card\" style=\"margin-top:14px\">
        <div class=\"section-title\">Notes</div>
        <div>{{notes}}</div>
      </div>
    {{/if}}

    {{#if include_bank_account}}
      {{#if bank_account}}
      <div class=\"card\" style=\"margin-top:14px\">
        <div class=\"section-title\">Bank Account</div>
        <div style=\"font-weight:600\">{{bank_account.name}}</div>
        {{#if bank_account.bankName}}<div>{{bank_account.bankName}}</div>{{/if}}
        {{#if bank_account.accountHolder}}<div>Account holder: {{bank_account.accountHolder}}</div>{{/if}}
        {{#if bank_account.accountNumberOrIban}}<div>Account/IBAN: {{bank_account.accountNumberOrIban}}</div>{{/if}}
        {{#if bank_account.sortCodeOrBic}}<div>Sort/BIC: {{bank_account.sortCodeOrBic}}</div>{{/if}}
        {{#if bank_account.currency}}<div>Currency: {{bank_account.currency}}</div>{{/if}}
      </div>
      {{/if}}
    {{/if}}

    {{#if payment_link}}
      <div class=\"card\" style=\"margin-top:14px\">
        <div class=\"section-title\">Payment Link</div>
        <div><a href=\"{{payment_link}}\" target=\"_blank\" rel=\"noopener noreferrer\">{{payment_link}}</a></div>
      </div>
    {{/if}}

    <div class=\"footer\">Generated by Indie Suite</div>
  </div>
</body></html>`

function formatCurrency(amount: number, currency: string) {
  const n = Number(amount || 0)
  const c = (currency || "GBP").toString().toUpperCase()
  const safe = Number.isFinite(n) ? n.toFixed(2) : "0.00"
  return `${c} ${safe}`
}

function formatDate(iso?: unknown) {
  if (typeof iso !== "string" || !iso) return iso as string | undefined
  const parts = iso.split("-")
  if (parts.length !== 3) return iso
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  const d = parseInt(parts[2], 10)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return iso
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const mmIdx = Math.min(Math.max(m - 1, 0), 11)
  const dd = String(d).padStart(2, "0")
  return `${dd} ${monthNames[mmIdx]} ${y}`
}

export function formatInvoiceData(raw: Record<string, unknown>) {
  const payments = Array.isArray(raw.payments) ? raw.payments as Array<{ currency?: string; amount?: number; name?: string; reference?: string }> : []
  const currency = payments[0]?.currency || (raw as { currency?: string }).currency || "GBP"
  const totalNum = payments.reduce((s, p) => s + (Number(p.amount || 0) || 0), 0)
  const paymentsFmt = payments.map(p => {
    const name = (p.name || "").trim()
    const ref = (p.reference || "").trim()
    const desc = name ? (ref ? `${name} – ${ref}` : name) : (ref || name || "Payment")
    return { ...p, desc, amountFormatted: formatCurrency(Number(p.amount||0), p.currency || currency) }
  })
  return {
    ...raw,
    issue_date: formatDate((raw as { issue_date?: string }).issue_date),
    due_date: formatDate((raw as { due_date?: string }).due_date),
    payments: paymentsFmt,
    currency,
    total: totalNum.toFixed(2),
    totalFormatted: formatCurrency(totalNum, currency),
  }
}

export function renderInvoiceHtml(data: Record<string, unknown>): string {
  const tpl = Handlebars.compile(baseTemplate)
  return tpl(formatInvoiceData(data))
}


