"use client"

import * as React from "react"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AddressForm, type AddressFormValues } from "@/components/settings/AddressForm"
import { createBusinessDetails, deleteBusinessDetails, listBusinessDetails, updateBusinessDetails, type BusinessDetails } from "@/lib/firebase/user-settings"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export default function SettingsAddressesPage() {
  const [rows, setRows] = React.useState<BusinessDetails[]>([])
  const [selected, setSelected] = React.useState<BusinessDetails | null>(null)
  const [editing, setEditing] = React.useState<boolean>(false)
  const [loading, setLoading] = React.useState<boolean>(true)
  const [confirmDelete, setConfirmDelete] = React.useState<BusinessDetails | null>(null)

  React.useEffect(() => {
    listBusinessDetails().then(setRows).catch(() => setRows([])).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">Business Details</h1>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Your business details</CardTitle>
            <CardAction className="flex gap-2">
              <Button variant="secondary" onClick={() => { setSelected(null); setEditing(true) }}>Add Business Details</Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading…</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No business details yet.</div>
            ) : (
              <div className="grid gap-2">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                    <div className="text-sm">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-muted-foreground">
                        {[r.building, r.street, r.city, r.area, r.postcode, r.country].filter(Boolean).join(", ")}
                      </div>
                      {(r.emails?.length || r.phone) ? (
                        <div className="text-muted-foreground text-xs mt-1">
                          {r.emails?.length ? `Emails: ${r.emails.join(', ')}` : ''} {r.emails?.length && r.phone ? ' · ' : ''}{r.phone ? `Phone: ${r.phone}` : ''}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setSelected(r); setEditing(true) }}>Edit</Button>
                      <Button variant="destructive" onClick={() => setConfirmDelete(r)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete business details</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {confirmDelete?.name ? `“${confirmDelete.name}”` : "these details"}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild><Button variant="outline">Cancel</Button></AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button variant="destructive" onClick={async () => {
                  if (!confirmDelete) return
                  const id = confirmDelete.id
                  setConfirmDelete(null)
                  await deleteBusinessDetails(id)
                  setRows((rows) => rows.filter((x) => x.id !== id))
                }}>Delete</Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {editing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{selected ? "Edit business details" : "Add business details"}</CardTitle>
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
                    await updateBusinessDetails(selected.id, values)
                    setRows((rows) => rows.map((r) => (r.id === selected.id ? { ...r, ...values } as BusinessDetails : r)))
                  } else {
                    const id = await createBusinessDetails(values)
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


