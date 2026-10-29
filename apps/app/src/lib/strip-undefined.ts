// Removes undefined values (which Firestore rejects) from plain objects and arrays, recursively.
// Only plain objects are copied: class instances such as serverTimestamp() / FieldValue sentinels,
// Timestamps and Dates are returned as-is. Copying a sentinel would store it as a map like
// { _methodName: "serverTimestamp" } instead of the server time.
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((entry) => stripUndefined(entry)) as unknown as T
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value)) {
      if (entry === undefined) continue
      out[key] = stripUndefined(entry)
    }
    return out as T
  }
  return value
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}
