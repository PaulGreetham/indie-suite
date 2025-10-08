"use client"

import * as React from "react"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TradingDetailsForm, type TradingDetailsFormValues } from "@/components/settings/TradingDetailsForm"
import { createTradingDetails, deleteTradingDetails, listTradingDetails, updateTradingDetails, type TradingDetails } from "@/lib/firebase/user-settings"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export default function SettingsTradingDetailsPage() {
  const [rows, setRows] = React.useState<TradingDetails[]>([])
  const [selected, setSelected] = React.useState<TradingDetails | null>(null)
  const [editing, setEditing] = React.useState<boolean>(false)
  const [loading, setLoading] = React.useState<boolean>(true)
  const [confirmDelete, setConfirmDelete] = React.useState<TradingDetails | null>(null)

  React.useEffect(() => {
    listTradingDetails().then(setRows).catch(() => setRows([])).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">Trading Details</h1>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Your trading details</CardTitle>
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
                  await deleteTradingDetails(id)
                  setRows((rows) => rows.filter((x) => x.id !== id))
                }}>Delete</Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {editing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{selected ? "Edit trading details" : "Add trading details"}</CardTitle>
              <CardAction>
                <Button variant="ghost" onClick={() => { setEditing(false); setSelected(null) }}>Close</Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <TradingDetailsForm
                initial={selected ?? undefined}
                submitLabel={selected ? "Save" : "Create"}
                onSubmit={async (values: TradingDetailsFormValues) => {
                  if (selected) {
                    await updateTradingDetails(selected.id, values)
                    setRows((rows) => rows.map((r) => (r.id === selected.id ? { ...r, ...values } as TradingDetails : r)))
                  } else {
                    const id = await createTradingDetails(values)
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


