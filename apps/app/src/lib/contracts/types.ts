export type ContractTerm = {
  text: string
}

export type ContractRecipient = {
  first_name?: string
  last_name?: string
  email?: string
  designation?: string
  order?: number
}

export type ContractInput = {
  title: string
  invoiceId?: string | null
  templateId?: string | null
  body?: string | null
  customerId?: string | null
  eventId?: string | null
  venueId?: string | null
  issueDate?: string | null
  dueDate?: string | null
  notes?: string | null
  status?: "draft" | "sent" | "signed" | "declined" | "void"
  terms?: ContractTerm[]
  recipients?: ContractRecipient[]
  firmaId?: string | null
  firmaUrl?: string | null
  businessId?: string | null
  contractData?: Record<string, string> | null
}
