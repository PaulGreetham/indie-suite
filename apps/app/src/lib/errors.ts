// User-facing message for a failed action. Firestore rule denials, network failures and the app's string
// error codes are mapped to actionable text; anything else gets the action's own fallback message.
export function actionErrorMessage(err: unknown, fallback: string): string {
  const e = err as { code?: string; message?: string } | null
  if (e?.code === "permission-denied") return "You don't have access to that. Reload the page and try again."
  // fetch() rejects with a TypeError when the request never reaches the server
  if (err instanceof TypeError && /fetch|network|load failed/i.test(err.message)) {
    return "Couldn't reach IndieSuite. Check your connection and try again."
  }
  switch (e?.message) {
    case "BUSINESS_REQUIRED": return "Create or select a business first."
    case "AUTH_REQUIRED": return "Please sign in again."
    case "INVOICE_NUMBER_NOT_UNIQUE": return "That invoice number is already used. Use a different number."
    case "rate_limited": return "Too many requests. Wait a minute and try again."
    default: return fallback
  }
}

// User-facing message for a failed save
export function saveErrorMessage(err: unknown): string {
  return actionErrorMessage(err, "Couldn't save. Please try again.")
}
