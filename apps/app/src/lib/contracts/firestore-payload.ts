import { stripUndefined } from "@/lib/strip-undefined"
import type { ContractInput } from "./types"

export function buildContractCreatePayload(input: ContractInput, ownerId: string, createdAt: unknown): Record<string, unknown> {
  return stripUndefined({
    ...buildContractBasePayload(input),
    createdAt,
    ownerId,
  })
}

export function buildContractUpdatePayload(updates: Partial<ContractInput>): Record<string, unknown> {
  return stripUndefined({
    title: updates.title,
    titleLower: updates.title ? updates.title.toLowerCase() : undefined,
    invoiceId: updates.invoiceId ?? null,
    templateId: updates.templateId ?? null,
    body: updates.body ?? null,
    customerId: updates.customerId ?? null,
    eventId: updates.eventId ?? null,
    venueId: updates.venueId ?? null,
    issueDate: updates.issueDate ?? null,
    dueDate: updates.dueDate ?? null,
    notes: updates.notes ?? null,
    status: updates.status,
    terms: Array.isArray(updates.terms) ? updates.terms.map((term) => ({ text: String(term?.text || "") })) : undefined,
    recipients: normalizeRecipients(updates.recipients),
    firmaId: updates.firmaId ?? null,
    firmaUrl: updates.firmaUrl ?? null,
    businessId: updates.businessId ?? null,
    contractData: updates.contractData ?? null,
  })
}

function buildContractBasePayload(input: ContractInput): Record<string, unknown> {
  return {
    title: input.title,
    titleLower: input.title.toLowerCase(),
    invoiceId: input.invoiceId ?? null,
    templateId: input.templateId ?? null,
    body: input.body ?? null,
    customerId: input.customerId ?? null,
    eventId: input.eventId ?? null,
    venueId: input.venueId ?? null,
    issueDate: input.issueDate ?? null,
    dueDate: input.dueDate ?? null,
    notes: input.notes ?? null,
    status: input.status ?? "draft",
    terms: Array.isArray(input.terms) ? input.terms.map((term) => ({ text: String(term?.text || "") })) : null,
    recipients: normalizeRecipients(input.recipients) ?? null,
    firmaId: input.firmaId ?? null,
    firmaUrl: input.firmaUrl ?? null,
    businessId: input.businessId ?? null,
    contractData: input.contractData ?? null,
  }
}

function normalizeRecipients(recipients: ContractInput["recipients"]): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(recipients)) return undefined
  return recipients.map((recipient) => ({
    first_name: recipient.first_name ?? null,
    last_name: recipient.last_name ?? null,
    email: recipient.email ?? null,
    designation: recipient.designation ?? null,
    order: recipient.order ?? null,
  }))
}
