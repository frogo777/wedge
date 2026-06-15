/**
 * Tests for `rateLimit` — in-memory sliding-window limiter.
 *
 * Run via:
 *   npx tsx src/lib/obs/rate-limit.test.ts
 */

import { rateLimit, clientIp, tooManyRequests } from "./rate-limit";

/* ─── helpers ───────────────────────────────────────── */

function eq<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(
      `${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`,
    );
  }
}
function truthy(v: unknown, label: string) {
  if (!v) throw new Error(`${label} (expected truthy, got ${JSON.stringify(v)})`);
}
function falsy(v: unknown, label: string) {
  if (v) throw new Error(`${label} (expected falsy, got ${JSON.stringify(v)})`);
}

function uniqueKey(prefix: string): string {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
}

/* ─── tests ─────────────────────────────────────────── */

async function testAllowsNRequests() {
  const key = uniqueKey("allow");
  for (let i = 0; i < 5; i++) {
    const r = await rateLimit(key, 5, 60);
    truthy(r.allowed, `request ${i + 1} allowed`);
  }
}

async function testBlocksNPlus1() {
  const key = uniqueKey("block");
  for (let i = 0; i < 3; i++) {
    const r = await rateLimit(key, 3, 60);
    truthy(r.allowed, `request ${i + 1} allowed`);
  }
  const blocked = await rateLimit(key, 3, 60);
  falsy(blocked.allowed, "4th request blocked");
  eq(blocked.remaining, 0, "remaining = 0 when blocked");
  truthy(blocked.resetAt > Date.now(), "resetAt is in the future");
}

async function testResetsAfterWindow() {
  const key = uniqueKey("reset");
  // Window of 1s. Fill bucket.
  for (let i = 0; i < 2; i++) {
    const r = await rateLimit(key, 2, 1);
    truthy(r.allowed, `initial fill ${i + 1}`);
  }
  // Immediately blocked.
  const blocked = await rateLimit(key, 2, 1);
  falsy(blocked.allowed, "blocked while window full");

  // Wait for the window to expire.
  await new Promise(res => setTimeout(res, 1100));

  const after = await rateLimit(key, 2, 1);
  truthy(after.allowed, "allowed again after window passes");
}

async function testIndependentKeys() {
  const ka = uniqueKey("ka");
  const kb = uniqueKey("kb");
  // Saturate ka.
  for (let i = 0; i < 2; i++) await rateLimit(ka, 2, 60);
  const blockedA = await rateLimit(ka, 2, 60);
  falsy(blockedA.allowed, "ka blocked");
  // kb still has full quota.
  const okB = await rateLimit(kb, 2, 60);
  truthy(okB.allowed, "kb independent of ka");
  eq(okB.remaining, 1, "kb remaining = 1 after first hit");
}

async function testRemainingDecrements() {
  const key = uniqueKey("rem");
  const r1 = await rateLimit(key, 3, 60);
  eq(r1.remaining, 2, "after 1st of 3, remaining = 2");
  const r2 = await rateLimit(key, 3, 60);
  eq(r2.remaining, 1, "after 2nd of 3, remaining = 1");
  const r3 = await rateLimit(key, 3, 60);
  eq(r3.remaining, 0, "after 3rd of 3, remaining = 0");
}

async function testClientIpExtraction() {
  // Construct a Request with x-forwarded-for header.
  const req = new Request("https://example.com", {
    headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
  });
  eq(clientIp(req), "203.0.113.7", "first IP from x-forwarded-for");

  const req2 = new Request("https://example.com", {
    headers: { "x-real-ip": "198.51.100.5" },
  });
  eq(clientIp(req2), "198.51.100.5", "x-real-ip fallback");

  const req3 = new Request("https://example.com");
  eq(clientIp(req3), "unknown", "unknown when no proxy headers");
}

async function testClientIpPrioritizesRealIp() {
  // SECURITY: x-forwarded-for es modificable por cliente. Si llega tanto
  // x-real-ip (trusted en Vercel) como x-forwarded-for (untrusted), DEBE
  // ganar el trusted. Test crítico — antes del fix esto fallaba.
  const req = new Request("https://example.com", {
    headers: {
      "x-forwarded-for": "1.1.1.1, 10.0.0.1",  // injected by attacker
      "x-real-ip":       "203.0.113.42",        // real client (set by Vercel)
    },
  });
  eq(clientIp(req), "203.0.113.42", "x-real-ip GANA sobre x-forwarded-for inyectado");
}

async function testClientIpVercelChain() {
  const req = new Request("https://example.com", {
    headers: {
      "x-vercel-forwarded-for": "203.0.113.99, 76.76.21.0",
      "x-forwarded-for":         "1.1.1.1",  // attacker tries to override
    },
  });
  // x-real-ip ausente → x-vercel-forwarded-for primer entry
  eq(clientIp(req), "203.0.113.99", "x-vercel-forwarded-for primer entry");
}

async function testClientIpTruncation() {
  // IPv6 con formato muy largo + chars inyectados (defense in depth)
  const longInjected = "a".repeat(120);
  const req = new Request("https://example.com", {
    headers: { "x-real-ip": longInjected },
  });
  const result = clientIp(req);
  truthy(result.length <= 64, `length truncada (got ${result.length})`);
}

async function testTooManyRequestsResponse() {
  const resp = tooManyRequests({ allowed: false, remaining: 0, resetAt: Date.now() + 5000 });
  eq(resp.status, 429, "status 429");
  eq(resp.headers.get("Content-Type"), "application/json; charset=utf-8", "JSON content-type");
  const retry = resp.headers.get("Retry-After");
  truthy(retry && Number(retry) >= 1, "Retry-After header set");
}

/* ─── runner ────────────────────────────────────────── */

const TESTS: Array<[string, () => Promise<void>]> = [
  ["allows N requests in window",        testAllowsNRequests],
  ["blocks N+1",                          testBlocksNPlus1],
  ["resets after window expires",         testResetsAfterWindow],
  ["different keys are independent",      testIndependentKeys],
  ["remaining decrements correctly",      testRemainingDecrements],
  ["clientIp extracts from proxy headers", testClientIpExtraction],
  ["clientIp PRIORITIZES x-real-ip (security)", testClientIpPrioritizesRealIp],
  ["clientIp uses x-vercel-forwarded-for chain", testClientIpVercelChain],
  ["clientIp truncates oversized IPs", testClientIpTruncation],
  ["tooManyRequests returns 429 + headers", testTooManyRequestsResponse],
];

export async function runRateLimitTests(): Promise<{ passed: number; failed: number }> {
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
  console.log(`\nrate-limit: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

if (typeof require !== "undefined" && require.main === module) {
  runRateLimitTests().then(r => process.exit(r.failed === 0 ? 0 : 1));
}
