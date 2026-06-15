/**
 * Tests para requireFreshAuth.
 * Run: npx tsx src/lib/obs/fresh-auth.test.ts
 */

import { requireFreshAuth, FRESH_AUTH_THRESHOLDS } from "./fresh-auth";
import type { User } from "@supabase/supabase-js";

function eq(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

function makeUser(lastSignInOffsetMs: number | null): User {
  return {
    id: "user-1",
    last_sign_in_at: lastSignInOffsetMs == null
      ? null
      : new Date(Date.now() - lastSignInOffsetMs).toISOString(),
  } as unknown as User;
}

const TESTS: Array<[string, () => Promise<void> | void]> = [
  ["null user → 401", () => {
    const r = requireFreshAuth(null, "CRITICAL");
    if (!r) throw new Error("expected response");
    eq(r.status, 401, "401");
  }],

  ["user sin last_sign_in_at → 403 re-auth-required", async () => {
    const r = requireFreshAuth(makeUser(null), "CRITICAL");
    if (!r) throw new Error("expected response");
    eq(r.status, 403, "403");
    const body = await r.json() as { error: string };
    eq(body.error, "re-auth-required", "error code");
  }],

  ["user CRITICAL fresh (5 min) → null", () => {
    const r = requireFreshAuth(makeUser(5 * 60 * 1000), "CRITICAL");
    eq(r, null, "fresh allowed");
  }],

  ["user CRITICAL stale (15 min) → 403", async () => {
    const r = requireFreshAuth(makeUser(15 * 60 * 1000), "CRITICAL");
    if (!r) throw new Error("expected response");
    eq(r.status, 403, "403");
    const body = await r.json() as { error: string; threshold: number };
    eq(body.error, "re-auth-required", "error");
    eq(body.threshold, FRESH_AUTH_THRESHOLDS.CRITICAL, "threshold echoed");
  }],

  ["user SENSITIVE fresh (3 horas) → null", () => {
    const r = requireFreshAuth(makeUser(3 * 60 * 60 * 1000), "SENSITIVE");
    eq(r, null, "3h OK para SENSITIVE (4h threshold)");
  }],

  ["user SENSITIVE stale (5 horas) → 403", () => {
    const r = requireFreshAuth(makeUser(5 * 60 * 60 * 1000), "SENSITIVE");
    if (!r) throw new Error("expected response");
    eq(r.status, 403, "5h excede 4h threshold");
  }],

  ["user STANDARD fresh (6 horas) → null", () => {
    const r = requireFreshAuth(makeUser(6 * 60 * 60 * 1000), "STANDARD");
    eq(r, null, "6h OK para STANDARD (8h)");
  }],

  ["user STANDARD stale (9 horas) → 403", () => {
    const r = requireFreshAuth(makeUser(9 * 60 * 60 * 1000), "STANDARD");
    if (!r) throw new Error("expected response");
    eq(r.status, 403, "9h excede 8h threshold");
  }],

  ["thresholds aumentan correctamente", () => {
    if (FRESH_AUTH_THRESHOLDS.CRITICAL >= FRESH_AUTH_THRESHOLDS.SENSITIVE) {
      throw new Error("CRITICAL debe ser < SENSITIVE");
    }
    if (FRESH_AUTH_THRESHOLDS.SENSITIVE >= FRESH_AUTH_THRESHOLDS.STANDARD) {
      throw new Error("SENSITIVE debe ser < STANDARD");
    }
  }],
];

async function run() {
  let passed = 0, failed = 0;
  for (const [name, fn] of TESTS) {
    try {
      await fn();
      passed++;
      console.log(`  ok ${name}`);
    } catch (err) {
      failed++;
      console.error(`  FAIL ${name}\n    ${(err as Error).message}`);
    }
  }
  console.log(`\nfresh-auth: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
run();
