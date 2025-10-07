"use client"

import * as React from "react"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BankAccountForm, type BankAccountFormValues } from "@/components/settings/BankAccountForm"
import { createBankAccount, deleteBankAccount, listBankAccounts, updateBankAccount, type BankAccount } from "@/lib/firebase/user-settings"

export default function SettingsBankAccountsPage() {
  const [rows, setRows] = React.useState<BankAccount[]>([])
  const [selected, setSelected] = React.useState<BankAccount | null>(null)
  const [editing, setEditing] = React.useState<boolean>(false)
  const [loading, setLoading] = React.useState<boolean>(true)

  React.useEffect(() => {
    listBankAccounts().then(setRows).catch(() => setRows([])).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-1">
      <h1 className="text-2xl font-semibold mb-6">Bank Accounts</h1>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Your bank accounts</CardTitle>
            <CardAction className="flex gap-2">
              <Button variant="secondary" onClick={() => { setSelected(null); setEditing(true) }}>Add Account</Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading…</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No bank accounts yet.</div>
            ) : (
              <div className="grid gap-2">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                    <div className="text-sm">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-muted-foreground">
                        {[r.bankName, r.accountHolder, r.accountNumberOrIban, r.sortCodeOrBic, r.currency].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setSelected(r); setEditing(true) }}>Edit</Button>
                      <Button variant="destructive" onClick={async () => {
                        await deleteBankAccount(r.id)
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
              <CardTitle className="text-xl">{selected ? "Edit account" : "Add account"}</CardTitle>
              <CardAction>
                <Button variant="ghost" onClick={() => { setEditing(false); setSelected(null) }}>Close</Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <BankAccountForm
                initial={selected ?? undefined}
                submitLabel={selected ? "Save" : "Create"}
                onSubmit={async (values: BankAccountFormValues) => {
                  if (selected) {
                    await updateBankAccount(selected.id, values)
                    setRows((rows) => rows.map((r) => (r.id === selected.id ? { ...r, ...values } as BankAccount : r)))
                  } else {
                    const id = await createBankAccount(values)
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


