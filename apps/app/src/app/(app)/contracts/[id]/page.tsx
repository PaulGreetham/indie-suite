"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { getFirestoreDb } from "@/lib/firebase/client"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export default function ContractDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [loading, setLoading] = React.useState(true)
  const [data, setData] = React.useState<Record<string, unknown> | null>(null)

  React.useEffect(() => {
    async function load() {
      const db = getFirestoreDb()
      const snap = await getDoc(doc(db, "contracts", String(id)))
      setData(snap.exists() ? (snap.data() as Record<string, unknown>) : null)
    }
    load().finally(() => setLoading(false))
  }, [id])

  function handleSend() {
    fetch("/api/contracts/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string }
        if (!res.ok) { toast.error(body.error || body.message || "Failed to send"); return }
        toast.success("Signing request sent")
      })
      .catch(() => toast.error("Failed to send"))
  }

  if (loading) return <div className="p-1">Loading…</div>
  if (!data) return <div className="p-1">Contract not found</div>

  const title = (data as { title?: string }).title || `Contract ${String(id).slice(0, 6)}`
  const status = (data as { status?: string }).status || "draft"
  const firmaUrl = (data as { firmaUrl?: string | null }).firmaUrl || null

  return (
    <div className="p-1 grid gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Badge variant="secondary">{status}</Badge>
        {firmaUrl ? (
          <a href={firmaUrl} target="_blank" rel="noreferrer" className="underline text-primary">Open in Firma</a>
        ) : null}
        <div className="ml-auto">
          <Button onClick={handleSend}>Send</Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-2 py-4">
          <div className="text-sm text-muted-foreground">Recipients</div>
          <div className="text-sm">
            {(data as { recipients?: Array<{ email?: string; first_name?: string; last_name?: string }> }).recipients?.map((r, i) => (
              <div key={i}>{[r.first_name, r.last_name].filter(Boolean).join(" ")} &lt;{r.email}&gt;</div>
            )) || "—"}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


