// Firebase Admin SDK for API routes (bypasses security rules). Credentials come from FIREBASE_PROJECT_ID,
// FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY, or from FIREBASE_SERVICE_ACCOUNT_JSON.
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore"

let adminApp: App | null = null

function initAdmin(): App {
  if (adminApp) return adminApp

  // Support either individual vars or a full JSON blob in FIREBASE_SERVICE_ACCOUNT_JSON
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  let projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  let clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let rawPk = process.env.FIREBASE_PRIVATE_KEY

  if (json && (!projectId || !clientEmail || !rawPk)) {
    const parsed = JSON.parse(json) as { project_id?: string; client_email?: string; private_key?: string }
    projectId = projectId || parsed.project_id
    clientEmail = clientEmail || parsed.client_email
    rawPk = rawPk || parsed.private_key
  }

  if (!getApps().length) {
    if (!projectId || !clientEmail || !rawPk) {
      throw new Error("Missing Firebase Admin env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY")
    }
    const privateKey = rawPk.replace(/\\n/g, "\n")
    adminApp = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  } else {
    adminApp = getApp()
  }
  return adminApp
}

export function getAdminDb(): Firestore {
  return getFirestore(initAdmin())
}

export function getAdminAuth(): Auth {
  return getAuth(initAdmin())
}

export const AdminFieldValue = FieldValue
