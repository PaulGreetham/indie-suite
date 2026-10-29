import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"

let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined
let appCheckStarted = false

// App Check makes Firebase accept requests only from this app (reCAPTCHA Enterprise). It stays off until
// NEXT_PUBLIC_RECAPTCHA_SITE_KEY is set, so it can ship before the key exists and be enforced later.
function startAppCheck(firebaseApp: FirebaseApp) {
  if (appCheckStarted || typeof window === "undefined") return
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  if (!siteKey) return
  appCheckStarted = true
  if (process.env.NODE_ENV === "development") {
    // Prints a debug token in the console; register it in Firebase console → App Check → Manage debug tokens
    ;(self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true
  }
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    }

    const required = [
      ["NEXT_PUBLIC_FIREBASE_API_KEY", config.apiKey],
      ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", config.authDomain],
      ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", config.projectId],
      ["NEXT_PUBLIC_FIREBASE_APP_ID", config.appId],
    ] as const
    const missing = required.filter(([, v]) => !v || String(v).trim() === "")
    if (missing.length > 0) {
      throw new Error("Firebase config is incomplete")
    }
    app = getApps()[0] ?? initializeApp(config)
    startAppCheck(app)
  }
  return app
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp())
  }
  return auth
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp())
  }
  return db
}


