/**
 * Tests para requireSameOrigin.
 * Run: npx tsx src/lib/obs/csrf.test.ts
 */

import { requireSameOrigin } from "./csrf";

function eq(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

function makeReq(headers: Record<string, string> = {}): Request {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) h.set(k, v);
  return new Request("https://wedgemx.com/api/billing/checkout", {
    method: "POST",
    headers: h,
  });
}

const TESTS: Array<[string, () => Promise<void> | void]> = [
  /* ─── allowed origins ───────────────────────────────────── */
  ["origin = wedgemx.com → allowed", () => {
    const r = requireSameOrigin(makeReq({ origin: "https://wedgemx.com" }));
    eq(r, null, "null = allowed");
  }],

  ["origin = www.wedgemx.com (subdomain) → allowed", () => {
    const r = requireSameOrigin(makeReq({ origin: "https://www.wedgemx.com" }));
    eq(r, null, "subdomain allowed");
  }],

  ["origin = vercel preview → allowed", () => {
    const r = requireSameOrigin(makeReq({ origin: "https://wedge-abc123.vercel.app" }));
    eq(r, null, "vercel preview allowed");
  }],

  ["origin = localhost (dev) → allowed", () => {
    const r = requireSameOrigin(makeReq({ origin: "http://localhost:3000" }));
    eq(r, null, "localhost allowed");
  }],

  ["referer = wedgemx.com (cuando no hay origin) → allowed", () => {
    const r = requireSameOrigin(makeReq({ referer: "https://wedgemx.com/precios" }));
    eq(r, null, "referer fallback funciona");
  }],

  /* ─── blocked origins ───────────────────────────────────── */
  ["origin = evil.com → 403", () => {
    const r = requireSameOrigin(makeReq({ origin: "https://evil.com" }));
    if (!r) throw new Error("expected 403");
    eq(r.status, 403, "403 status");
  }],

  ["origin = wedgemx.com.evil.com (suffix attack) → 403", () => {
    const r = requireSameOrigin(makeReq({ origin: "https://wedgemx.com.evil.com" }));
    if (!r) throw new Error("expected 403");
    eq(r.status, 403, "rechaza ataque de subdomain confusion");
  }],

  ["origin = evilwedgemx.com (sin punto) → 403", () => {
    const r = requireSameOrigin(makeReq({ origin: "https://evilwedgemx.com" }));
    if (!r) throw new Error("expected 403");
    eq(r.status, 403, "rechaza prefix attack");
  }],

  ["sin Origin ni Referer → 403", () => {
    const r = requireSameOrigin(makeReq());
    if (!r) throw new Error("expected 403");
    eq(r.status, 403, "rechaza ausencia total");
  }],

  ["origin malformado → 403", () => {
    const r = requireSameOrigin(makeReq({ origin: "not-a-url" }));
    if (!r) throw new Error("expected 403");
    eq(r.status, 403, "URL inválida → reject");
  }],

  /* ─── edge cases ────────────────────────────────────────── */
  ["origin con puerto distinto (3001) → allowed (localhost)", () => {
    const r = requireSameOrigin(makeReq({ origin: "http://localhost:3001" }));
    eq(r, null, "puerto custom localhost OK");
  }],

  ["origin tiene mayúsculas → allowed (case insensitive)", () => {
    const r = requireSameOrigin(makeReq({ origin: "https://WEDGEMX.COM" }));
    eq(r, null, "case insensitive");
  }],
];

let passed = 0, failed = 0;
for (const [name, fn] of TESTS) {
  try {
    fn();
    passed++;
    console.log(`  ok ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}\n    ${(err as Error).message}`);
  }
}
console.log(`\ncsrf: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
