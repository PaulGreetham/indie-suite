import { defineConfig } from "vitest/config"

// Firestore security rules tests. Run against the emulator via `npm run test:rules -w app`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["firestore-tests/**/*.rules.test.ts"],
    // The emulator is shared state, so run files one at a time
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
})
