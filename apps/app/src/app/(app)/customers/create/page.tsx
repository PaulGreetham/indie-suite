"use client"

import { useRouter } from "next/navigation"
import { CustomerForm, type CustomerFormValues } from "@/components/customers/CustomerForm"
import { createCustomer } from "@/lib/firebase/customers"
import { toast } from "sonner"
import { useBusiness } from "@/lib/business-context"

export default function AddCustomerPage() {
  const router = useRouter()
  const { resolveActiveBusinessId } = useBusiness()

  async function handleSubmit(values: CustomerFormValues) {
    const businessId = await resolveActiveBusinessId()
    await createCustomer({ ...values, businessId })
    toast.success("Customer saved successfully", { duration: 3500 })
  }

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">Create Customer</h1>
      <CustomerForm submitLabel="Save" onSubmit={handleSubmit} onCancel={() => router.back()} />
    </div>
  )
}


