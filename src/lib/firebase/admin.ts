import { cert, applicationDefault, getApps, initializeApp, type App, getApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

let app: App
if (!getApps().length) {
  // Option 1: Full JSON provided as an env var
  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (credsJson) {
    try {
      const parsed = JSON.parse(credsJson) as { project_id?: string; client_email?: string; private_key?: string }
      if (!parsed.project_id || !parsed.client_email || !parsed.private_key) throw new Error("Bad GOOGLE_APPLICATION_CREDENTIALS_JSON")
      app = initializeApp({ credential: cert({ projectId: parsed.project_id, clientEmail: parsed.client_email, privateKey: parsed.private_key }) })
    } catch (e) {
      throw new Error(`Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON: ${(e as Error).message}`)
    }
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    let privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
    // Option 2: private key provided base64-encoded to avoid newline issues
    const pkB64 = process.env.FIREBASE_PRIVATE_KEY_BASE64
    if (!privateKey && pkB64) privateKey = Buffer.from(pkB64, "base64").toString("utf8")
    if (projectId && clientEmail && privateKey) {
      app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // ADC via file path
      app = initializeApp({ credential: applicationDefault(), projectId: projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID })
    } else {
      // Last resort fallback (works for token verification when platform injects default creds)
      const pid = projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      if (!pid) throw new Error("Missing FIREBASE_PROJECT_ID for Admin initialization")
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - allow init without explicit credential for token verification only
      app = initializeApp({ projectId: pid, credential: applicationDefault() })
    }
  }
} else {
  app = getApp()
}

export const adminDb = getFirestore(app)
export const adminAuth = getAuth(app)


