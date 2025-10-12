// Admin SDK no longer used for PDF generation.
// This file kept as a placeholder to avoid import errors if referenced elsewhere.
import * as admin from "firebase-admin"

let adminApp: admin.app.App | null = null

function initAdmin(): admin.app.App {
  if (adminApp) return adminApp

  // Support common env var styles
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const rawPk = process.env.FIREBASE_PRIVATE_KEY

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


