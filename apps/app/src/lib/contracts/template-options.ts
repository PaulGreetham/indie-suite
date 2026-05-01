export type ContractTemplateOption = {
  key: string
  name: string
  description: string
}

export const CONTRACT_TEMPLATE_OPTIONS: ContractTemplateOption[] = [
  {
    key: "starter-service-agreement",
    name: "Starter Service Agreement",
    description: "A simple starter contract template for event and service bookings.",
  },
]

export function getContractTemplateOption(key: string): ContractTemplateOption | null {
  return CONTRACT_TEMPLATE_OPTIONS.find((template) => template.key === key) || null
}
