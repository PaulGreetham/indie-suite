import * as React from "react"
import { Document, Page, Text, View, StyleSheet, Image, Link } from "@react-pdf/renderer"

const styles = StyleSheet.create({
	page: { padding: 32, fontSize: 11, color: "#0f172a", fontFamily: "Helvetica" },
	row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	muted: { color: "#64748b" },
	chip: { fontSize: 9, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: "#0f172a", color: "#fff", borderRadius: 4 },
	brandBar: { backgroundColor: "#fcf300", height: 4, borderRadius: 2, marginBottom: 12 },
	header: { marginBottom: 18 },
	logo: { width: 120, height: 22, objectFit: "contain" },
	grid: { flexDirection: "row", gap: 16 },
	card: { border: 1, borderColor: "#e2e8f0", borderRadius: 6, padding: 10 },
	label: { color: "#64748b" },
	title: { fontSize: 18, fontWeight: 700 },
	sectionTitle: { fontSize: 9, textTransform: "uppercase", color: "#64748b", marginBottom: 6 },
	tableHeader: { flexDirection: "row", borderBottom: 1, borderColor: "#e2e8f0", paddingBottom: 6, marginTop: 12 },
	cell: { flex: 1 },
	cellRight: { flex: 1, textAlign: "right" },
	line: { flexDirection: "row", borderBottom: 1, borderColor: "#f1f5f9", paddingVertical: 6 },
	footer: { marginTop: 18, color: "#94a3b8", fontSize: 10 },
})

export type InvoiceForPdf = {
	invoice_number?: string
	issue_date?: string
	due_date?: string
	status?: string
	user_business_name?: string
	user_email?: string
	user_contact_name?: string
	customer_name?: string
	customer_email?: string
	customer_phone?: string
	venue_name?: string
	venue_city?: string
	venue_postcode?: string
	venue_phone?: string
	payment_link?: string
	include_bank_account?: boolean
	bank_account?: {
		name?: string
		bankName?: string
		accountHolder?: string
		accountNumberOrIban?: string
		sortCodeOrBic?: string
		currency?: string
	} | null
	payments?: Array<{
		name?: string
		reference?: string
		invoice_number?: string
		issue_date?: string
		due_date?: string
		currency?: string
		amount?: number
		amountFormatted?: string
	}>
	notes?: string
	totalFormatted?: string
}

export function InvoicePdf({ invoice, brandLogoUrl }: { invoice: InvoiceForPdf; brandLogoUrl?: string }) {
	const payments = Array.isArray(invoice.payments) ? invoice.payments : []
	const currency = payments[0]?.currency || "GBP"
	const total = payments.reduce((s, p) => s + (Number(p.amount || 0) || 0), 0)

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				<View style={styles.brandBar} />
				<View style={[styles.header, styles.row]}>
					<View style={{ gap: 6 }}>
					{brandLogoUrl ? <Image style={styles.logo} src={brandLogoUrl} /> : <Text style={styles.title}>Indie Suite</Text>}
					<Text style={styles.muted}>Invoice</Text>
					</View>
					<View style={{ alignItems: "flex-end", gap: 4 }}>
						{invoice.status ? <Text style={styles.chip}>{String(invoice.status).toUpperCase()}</Text> : null}
						<View style={{ gap: 2 }}>
							<View style={styles.row}><Text style={styles.label}>Invoice #</Text><Text> {invoice.invoice_number || payments[0]?.invoice_number || ""}</Text></View>
							<View style={styles.row}><Text style={styles.label}>Issue</Text><Text> {invoice.issue_date || payments[0]?.issue_date || ""}</Text></View>
							<View style={styles.row}><Text style={styles.label}>Due</Text><Text> {invoice.due_date || payments[0]?.due_date || ""}</Text></View>
						</View>
					</View>
				</View>

				<View style={styles.grid}>
					<View style={[styles.card, { flex: 1 }]}> 
						<Text style={styles.sectionTitle}>Bill To</Text>
						<Text style={{ fontWeight: 700 }}>{invoice.customer_name}</Text>
						{invoice.customer_email ? <Text>{invoice.customer_email}</Text> : null}
						{invoice.customer_phone ? <Text>{invoice.customer_phone}</Text> : null}
					</View>
					<View style={[styles.card, { flex: 1 }]}> 
						<Text style={styles.sectionTitle}>From</Text>
						<Text style={{ fontWeight: 700 }}>{invoice.user_business_name}</Text>
						{invoice.user_contact_name ? <Text>{invoice.user_contact_name}</Text> : null}
						{invoice.user_email ? <Text>{invoice.user_email}</Text> : null}
					</View>
				</View>

				{(invoice.venue_name || invoice.venue_city || invoice.venue_postcode) ? (
					<View style={[styles.card, { marginTop: 10 }]}> 
						<Text style={styles.sectionTitle}>Venue</Text>
						{invoice.venue_name ? <Text>{invoice.venue_name}</Text> : null}
						<Text>{[invoice.venue_city, invoice.venue_postcode].filter(Boolean).join(", ")}</Text>
						{invoice.venue_phone ? <Text>{invoice.venue_phone}</Text> : null}
					</View>
				) : null}

				<View style={styles.tableHeader}>
					<Text style={[styles.cell, { flex: 3 }]}>Description</Text>
					<Text style={styles.cellRight}>Amount</Text>
				</View>
				{payments.map((p, i) => (
					<View key={i} style={styles.line}>
						<Text style={[styles.cell, { flex: 3 }]}>{p.name || p.reference || "Payment"}</Text>
						<Text style={styles.cellRight}>{p.amountFormatted || `${currency} ${(Number(p.amount||0)).toFixed(2)}`}</Text>
					</View>
				))}
				<View style={[styles.row, { marginTop: 8 }]}> 
					<Text style={{ fontWeight: 700 }}>Total</Text>
					<Text style={{ fontWeight: 700 }}>{invoice.totalFormatted || `${currency} ${total.toFixed(2)}`}</Text>
				</View>

				{invoice.notes ? (
					<View style={[styles.card, { marginTop: 12 }]}> 
						<Text style={styles.sectionTitle}>Notes</Text>
						<Text>{invoice.notes}</Text>
					</View>
				) : null}

				{invoice.payment_link ? (
					<View style={[styles.card, { marginTop: 12 }]}> 
						<Text style={styles.sectionTitle}>Payment Link</Text>
						<Link src={invoice.payment_link}><Text>{invoice.payment_link}</Text></Link>
					</View>
				) : null}

				{invoice.include_bank_account && invoice.bank_account ? (
					<View style={[styles.card, { marginTop: 12 }]}> 
						<Text style={styles.sectionTitle}>Bank Account</Text>
						{invoice.bank_account.name ? <Text style={{ fontWeight: 700 }}>{invoice.bank_account.name}</Text> : null}
						{invoice.bank_account.bankName ? <Text>{invoice.bank_account.bankName}</Text> : null}
						{invoice.bank_account.accountHolder ? <Text>Account holder: {invoice.bank_account.accountHolder}</Text> : null}
						{invoice.bank_account.accountNumberOrIban ? <Text>Account/IBAN: {invoice.bank_account.accountNumberOrIban}</Text> : null}
						{invoice.bank_account.sortCodeOrBic ? <Text>Sort/BIC: {invoice.bank_account.sortCodeOrBic}</Text> : null}
						{invoice.bank_account.currency ? <Text>Currency: {invoice.bank_account.currency}</Text> : null}
					</View>
				) : null}

				<Text style={styles.footer}>Generated by Indie Suite</Text>
			</Page>
		</Document>
	)
}
