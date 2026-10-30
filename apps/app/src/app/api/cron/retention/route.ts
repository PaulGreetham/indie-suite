import { NextRequest } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin"
import { eraseUser } from "@/lib/server/erase-user"
import { handleRouteError } from "@/lib/server/auth"
import { requireSecret } from "@/lib/server/secret-auth"
import { BILLING_COLLECTION, isLiveSubscriptionStatus, type BillingRecord } from "@/lib/stripe/billing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Closed accounts are kept for reinstatement for 12 months after their subscription ended, then erased (S-09)
const RETENTION_SECONDS = 365 * 24 * 60 * 60
// Sign-ups that never verified their email are removed after 30 days
const UNVERIFIED_SECONDS = 30 * 24 * 60 * 60
// Keeps each run well inside the function time limit; the daily schedule works through any backlog
const MAX_PER_RUN = 10
const MAX_AUTH_PAGES = 3

// Auth users who never started a subscription (no billing doc, or one without a subscriptionId, e.g. a
// trial start that failed part-way): unverified ones after 30 days, verified ones after 12 months
async function findAbandonedSignups(nowMs: number, max: number): Promise<string[]> {
  const db = getAdminDb()
  const found: string[] = []
  let pageToken: string | undefined
  for (let page = 0; page < MAX_AUTH_PAGES && found.length < max; page++) {
    const res = await getAdminAuth().listUsers(1000, pageToken)
    const candidates = res.users.filter((u) => {
      const ageSeconds = (nowMs - Date.parse(u.metadata.creationTime)) / 1000
      return ageSeconds > (u.emailVerified ? RETENTION_SECONDS : UNVERIFIED_SECONDS)
    })
    if (candidates.length) {
      const snaps = await db.getAll(...candidates.map((u) => db.collection(BILLING_COLLECTION).doc(u.uid)))
      snaps.forEach((snap, i) => {
        if (!(snap.data() as BillingRecord | undefined)?.subscriptionId) found.push(candidates[i].uid)
      })
    }
    pageToken = res.pageToken
    if (!pageToken) break
  }
  return found.slice(0, max)
}

async function eraseAll(uids: string[], kind: string): Promise<{ erased: number; failed: number }> {
  let erased = 0
  let failed = 0
  for (const uid of uids) {
    try {
      await eraseUser(uid)
      erased++
    } catch (err) {
      console.error(`retention: erase failed (${kind})`, uid, err instanceof Error ? err.message : err)
      failed++
    }
  }
  return { erased, failed }
}

// Called daily by Vercel Cron (vercel.json), which sends "Authorization: Bearer <CRON_SECRET>"
export async function GET(req: NextRequest) {
  try {
    requireSecret(req, process.env.CRON_SECRET)

    const now = Date.now()
    const cutoff = Math.floor(now / 1000) - RETENTION_SECONDS
    const snap = await getAdminDb().collection(BILLING_COLLECTION).where("endedAt", "<", cutoff).limit(MAX_PER_RUN * 2).get()
    const closed = snap.docs
      .filter((d) => !isLiveSubscriptionStatus((d.data() as BillingRecord).status))
      .slice(0, MAX_PER_RUN)
      .map((d) => d.id)

    const closedResult = await eraseAll(closed, "closed")
    const abandonedResult = await eraseAll(await findAbandonedSignups(now, MAX_PER_RUN), "abandoned")
    const result = { ...closedResult, abandonedErased: abandonedResult.erased, abandonedFailed: abandonedResult.failed }
    console.log("retention: run complete", result)
    return new Response(JSON.stringify(result), { status: 200 })
  } catch (err) {
    return handleRouteError(err, "/api/cron/retention")
  }
}
