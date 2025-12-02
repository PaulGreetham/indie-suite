import { getFirmaClient } from "@/lib/firma/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const firma = getFirmaClient()
  const data = await firma.listTemplates().catch(() => ({ error: "list_failed" }))
  if ((data as { error?: string }).error) return new Response(JSON.stringify(data), { status: 500 })
  return new Response(JSON.stringify(data), { status: 200 })
}


