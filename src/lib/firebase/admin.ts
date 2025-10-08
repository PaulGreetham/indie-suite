import { cert, applicationDefault, getApps, initializeApp, type App, getApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

let app: App
if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
  if (projectId && clientEmail && privateKey) {
    app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    // If ADC is available in the environment, use it
    app = initializeApp({ credential: applicationDefault(), projectId: projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID })
  } else {
    // As a last resort, initialize with only projectId. This is sufficient for verifyIdToken()
    const pid = projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    if (!pid) throw new Error("Missing FIREBASE_PROJECT_ID for Admin initialization")
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - allow init without explicit credential for token verification only
    app = initializeApp({ projectId: pid })
  }
} else {
  app = getApp()
}

export const adminDb = getFirestore(app)
export const adminAuth = getAuth(app)


