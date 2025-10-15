// Admin SDK no longer used for PDF generation.
// This file kept as a placeholder to avoid import errors if referenced elsewhere.
import * as admin from "firebase-admin"

let adminApp: admin.app.App | null = null

function initAdmin(): admin.app.App {
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

  if (!admin.apps.length) {
    if (!projectId || !clientEmail || !rawPk) {
      throw new Error("Missing Firebase Admin env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY")
    }
    const privateKey = rawPk.replace(/\\n/g, "\n")
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    })
  } else {
    adminApp = admin.app()
  }
  return adminApp!
}

export function getAdminDb(): admin.firestore.Firestore {
  return initAdmin().firestore()
}

export function getAdminAuth(): admin.auth.Auth {
  return initAdmin().auth()
}

export const AdminFieldValue = admin.firestore.FieldValue

export type { admin }


