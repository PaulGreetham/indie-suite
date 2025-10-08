import * as React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

const styles = StyleSheet.create({
	page: { padding: 28, fontSize: 11, color: "#111" },
	section: { marginBottom: 12 },
	header: { fontSize: 18, marginBottom: 8 },
	row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
	label: { color: "#666" },
	tableHeader: { flexDirection: "row", borderBottom: 1, borderColor: "#ddd", paddingBottom: 4, marginTop: 10 },
	cell: { flex: 1 },
})

export type InvoiceForPdf = {
	invoice_number?: string
	issue_date?: string
	due_date?: string
	user_business_name?: string
	user_email?: string
	customer_name?: string
	customer_email?: string
	venue_name?: string
	venue_city?: string
	venue_postcode?: string
	venue_phone?: string
	payments?: Array<{
		name?: string
		reference?: string
		invoice_number?: string
		issue_date?: string
		due_date?: string
		currency?: string
		amount?: number
	}>
	notes?: string
}

export function InvoicePdf({ invoice }: { invoice: InvoiceForPdf }) {
	const payments = Array.isArray(invoice.payments) ? invoice.payments : []
	const total = payments.reduce((s, p) => s + (Number(p.amount || 0) || 0), 0)

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				<View style={styles.section}>
					<Text style={styles.header}>{invoice.user_business_name || "Invoice"}</Text>
					<View style={styles.row}><Text style={styles.label}>Invoice #</Text><Text>{invoice.invoice_number || payments[0]?.invoice_number || ""}</Text></View>
					<View style={styles.row}><Text style={styles.label}>Issue</Text><Text>{invoice.issue_date || payments[0]?.issue_date || ""}</Text></View>
					<View style={styles.row}><Text style={styles.label}>Due</Text><Text>{invoice.due_date || payments[0]?.due_date || ""}</Text></View>
				</View>

				<View style={styles.section}>
					<Text style={styles.label}>Bill To</Text>
					<Text>{invoice.customer_name}</Text>
					<Text>{invoice.customer_email}</Text>
				</View>

				{(invoice.venue_name || invoice.venue_city || invoice.venue_postcode) && (
					<View style={styles.section}>
						<Text style={styles.label}>Venue</Text>
						<Text>{invoice.venue_name}</Text>
						<Text>{[invoice.venue_city, invoice.venue_postcode].filter(Boolean).join(", ")}</Text>
					</View>
				)}

				<View style={styles.tableHeader}>
					<Text style={[styles.cell, { flex: 3 }]}>Description</Text>
					<Text style={[styles.cell, { textAlign: "right" }]}>Amount</Text>
				</View>
				{payments.map((p, i) => (
					<View key={i} style={[styles.row, { marginBottom: 2 }]}> 
						<Text style={[styles.cell, { flex: 3 }]}>{p.name || p.reference || "Payment"}</Text>
						<Text style={[styles.cell, { textAlign: "right" }]}>{`${p.currency || "GBP"} ${(Number(p.amount||0)).toFixed(2)}`}</Text>
					</View>
				))}
				<View style={[styles.row, { marginTop: 6 }]}> 
					<Text style={styles.label}>Total</Text>
					<Text>{`${payments[0]?.currency || "GBP"} ${total.toFixed(2)}`}</Text>
				</View>

				{invoice.notes ? (
					<View style={[styles.section, { marginTop: 12 }]}> 
						<Text style={styles.label}>Notes</Text>
						<Text>{invoice.notes}</Text>
					</View>
				) : null}
			</Page>
		</Document>
	)
}


