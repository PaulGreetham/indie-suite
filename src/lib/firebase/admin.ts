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
  } else {
    // Fall back to Application Default Credentials (gcloud auth application-default login)
    app = initializeApp({ credential: applicationDefault() })
  }
} else {
  app = getApp()
}

export const adminDb = getFirestore(app)
export const adminAuth = getAuth(app)


