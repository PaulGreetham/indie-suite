"use client"

import { useRouter } from "next/navigation"
import { CustomerForm, type CustomerFormValues } from "@/components/customers/CustomerForm"
import { createCustomer } from "@/lib/firebase/customers"
import { toast } from "sonner"

export default function AddCustomerPage() {
  const router = useRouter()

  async function handleSubmit(values: CustomerFormValues) {
    await createCustomer(values)
    toast.success("Customer saved successfully", { duration: 3500 })
  }

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">Create Customer</h1>
      <CustomerForm submitLabel="Save" onSubmit={handleSubmit} onCancel={() => router.back()} />
    </div>
  )
}


