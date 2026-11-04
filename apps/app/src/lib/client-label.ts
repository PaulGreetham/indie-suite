// How a client is named everywhere in the UI: the business (company) name, or the contact's name
// when the client has no company (UX-32)
export function clientLabel(client: { company?: string | null; fullName?: string | null }): string {
  return client.company?.trim() || client.fullName?.trim() || "Unnamed client"
}
