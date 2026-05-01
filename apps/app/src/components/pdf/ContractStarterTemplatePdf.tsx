import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#111827",
    lineHeight: 1.5,
  },
  title: {
    fontSize: 22,
    marginBottom: 24,
    fontWeight: 700,
  },
  section: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: 700,
  },
  muted: {
    color: "#4b5563",
  },
  signatureRow: {
    marginTop: 40,
    flexDirection: "row",
    gap: 32,
  },
  signatureBox: {
    flexGrow: 1,
    borderTopWidth: 1,
    borderTopColor: "#111827",
    paddingTop: 8,
  },
})

export function ContractStarterTemplatePdf() {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Service Agreement</Text>

        <View style={styles.section}>
          <Text style={styles.heading}>Event</Text>
          <Text>Event: event_title</Text>
          <Text>Date: event_start_date</Text>
          <Text>Venue: venue_name</Text>
          <Text style={styles.muted}>Venue address: venue_address</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Customer</Text>
          <Text>Customer: customer_name</Text>
          <Text>Email: customer_email</Text>
          <Text>Company: customer_company</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Fees</Text>
          <Text>Total: invoice_total</Text>
          <Text>Deposit: invoice_deposit</Text>
          <Text>Invoice: invoice_number</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Terms</Text>
          <Text>contract_terms</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Additional Notes</Text>
          <Text>contract_notes</Text>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text>Customer signature</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text>Date</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
