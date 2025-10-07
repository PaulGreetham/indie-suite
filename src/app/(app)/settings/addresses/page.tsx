"use client"

import * as React from "react"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AddressForm, type AddressFormValues } from "@/components/settings/AddressForm"
import { createAddress, deleteAddress, listAddresses, updateAddress, type Address } from "@/lib/firebase/user-settings"

export default function SettingsAddressesPage() {
  const [rows, setRows] = React.useState<Address[]>([])
  const [selected, setSelected] = React.useState<Address | null>(null)
  const [editing, setEditing] = React.useState<boolean>(false)
  const [loading, setLoading] = React.useState<boolean>(true)

  React.useEffect(() => {
    listAddresses().then(setRows).catch(() => setRows([])).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">Addresses</h1>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Your addresses</CardTitle>
            <CardAction className="flex gap-2">
              <Button variant="secondary" onClick={() => { setSelected(null); setEditing(true) }}>Add Address</Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading…</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No addresses yet.</div>
            ) : (
              <div className="grid gap-2">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                    <div className="text-sm">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-muted-foreground">
                        {[r.building, r.street, r.city, r.area, r.postcode, r.country].filter(Boolean).join(", ")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setSelected(r); setEditing(true) }}>Edit</Button>
                      <Button variant="destructive" onClick={async () => {
                        await deleteAddress(r.id)
                        setRows((rows) => rows.filter((x) => x.id !== r.id))
                      }}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {editing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{selected ? "Edit address" : "Add address"}</CardTitle>
              <CardAction>
                <Button variant="ghost" onClick={() => { setEditing(false); setSelected(null) }}>Close</Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <AddressForm
                initial={selected ?? undefined}
                submitLabel={selected ? "Save" : "Create"}
                onSubmit={async (values: AddressFormValues) => {
                  if (selected) {
                    await updateAddress(selected.id, values)
                    setRows((rows) => rows.map((r) => (r.id === selected.id ? { ...r, ...values } as Address : r)))
                  } else {
                    const id = await createAddress(values)
                    setRows((rows) => [{ id, createdAt: new Date(), ...values }, ...rows])
                  }
                  setEditing(false)
                  setSelected(null)
                }}
                onCancel={() => { setEditing(false); setSelected(null) }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


