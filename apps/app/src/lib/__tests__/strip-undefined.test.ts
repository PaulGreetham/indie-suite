import { describe, expect, it } from "vitest"
import { serverTimestamp, Timestamp } from "firebase/firestore"
import { FieldValue } from "firebase-admin/firestore"
import { stripUndefined } from "../strip-undefined"

describe("stripUndefined", () => {
  it("removes undefined keys recursively from plain objects and arrays", () => {
    expect(stripUndefined({ a: 1, b: undefined, c: { d: undefined, e: null }, f: [{ g: undefined, h: "x" }] }))
      .toEqual({ a: 1, c: { e: null }, f: [{ h: "x" }] })
  })

  it("keeps the client serverTimestamp() sentinel intact", () => {
    const sentinel = serverTimestamp()
    const out = stripUndefined({ createdAt: sentinel, nested: { at: sentinel } })
    expect(out.createdAt).toBe(sentinel)
    expect(out.nested.at).toBe(sentinel)
  })

  it("keeps the Admin FieldValue.serverTimestamp() sentinel intact", () => {
    const sentinel = FieldValue.serverTimestamp()
    expect(stripUndefined({ createdAt: sentinel }).createdAt).toBe(sentinel)
  })

  it("keeps Timestamps and Dates intact", () => {
    const ts = Timestamp.fromMillis(0)
    const date = new Date(0)
    const out = stripUndefined({ ts, date })
    expect(out.ts).toBe(ts)
    expect(out.date).toBe(date)
  })
})
