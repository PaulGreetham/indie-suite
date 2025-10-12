import { getFirmaClient } from "@/lib/firma/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const firma = getFirmaClient()
    const data = await firma.listTemplates()
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 })
  }
}


