/**
 * Vitest config — wedge
 *
 * Tests in this repo follow two patterns:
 *   1. Plain script tests under `src/**\/*.test.ts` that export a `run*Tests()`
 *      function and self-execute via `tsx` (the legacy runner used in CI).
 *   2. Vitest tests under `src/**\/*.vitest.ts` and the harness in
 *      `tests/vitest/*` which wraps the script tests with `it()`/`expect()`
 *      so we get a single, unified runner.
 *
 * We deliberately exclude `*.test.ts` from Vitest's discovery to avoid
 * double-running the legacy scripts (and to avoid Vitest tripping on tests
 * that hit external services like OpenAI). The legacy runner stays in CI as
 * a safety net until the harness covers everything.
 */
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Stub Next.js's `server-only` guard during tests — under Vitest there
      // is no client/server boundary to enforce, and the real package throws
      // synchronously at import time outside a Next build.
      "server-only": path.resolve(__dirname, "./tests/vitest/__shims__/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    // Harness lives under tests/vitest; Vitest tests can also live next to
    // source as `*.vitest.ts`.
    include: ["tests/vitest/**/*.test.ts", "src/**/*.vitest.ts"],
    exclude: [
      "node_modules/**",
      "e2e/**",
      ".next/**",
      "test-results/**",
      // Legacy script tests — exercised via the harness, not directly.
      "src/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "**/node_modules/**",
        "**/.next/**",
        "**/e2e/**",
        "**/coverage/**",
        "**/*.config.{ts,js,mjs}",
        "**/*.test.ts",
        "**/*.vitest.ts",
        "**/tests/**",
      ],
    },
  },
});
