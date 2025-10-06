"use client"

import InvoiceForm from "@/components/invoices/InvoiceForm"

export default function CreateInvoicePage() {
  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-4">Create Invoice</h1>
      <InvoiceForm />
    </div>
  )
}


