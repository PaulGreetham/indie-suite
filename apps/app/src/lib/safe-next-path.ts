// A ?next= value is only followed when it is a path on this site, so the link can't send users to
// another origin ("//evil.com" and "/\evil.com" are treated by browsers as off-site URLs)
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null
  return value
}
