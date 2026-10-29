// User-facing message for a failed save. Firestore rule denials and the app's string error codes
// are mapped to actionable text; anything else gets a generic message.
export function saveErrorMessage(err: unknown): string {
  const e = err as { code?: string; message?: string } | null
  if (e?.code === "permission-denied") return "You don't have access to that. Reload the page and try again."
  switch (e?.message) {
    case "BUSINESS_REQUIRED": return "Create or select a business first."
    case "AUTH_REQUIRED": return "Please sign in again."
    default: return "Couldn't save. Please try again."
  }
}
