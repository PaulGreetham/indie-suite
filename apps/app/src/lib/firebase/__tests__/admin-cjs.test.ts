// @vitest-environment node
import { execFileSync } from "node:child_process"
import { describe, expect, it } from "vitest"

// Vercel's function runtime can't require() ES modules, unlike local Node 22.12+. firebase-admin 14 broke every
// API route there because jwks-rsa (CJS) required jose 6 (ESM-only); package.json overrides it to jose 5.
// Loading firebase-admin with require(esm) disabled reproduces that runtime.
describe("firebase-admin under Vercel's CommonJS loader", () => {
  it("loads without requiring an ES module", () => {
    const out = execFileSync(process.execPath, [
      "--no-experimental-require-module",
      "-e",
      "require('firebase-admin/app'); require('firebase-admin/auth'); require('firebase-admin/firestore'); console.log('ok')",
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
    expect(out.trim()).toBe("ok")
  }, 30000)
})
