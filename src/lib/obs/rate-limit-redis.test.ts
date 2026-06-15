/**
 * Tests para rate-limit-redis con fetch mockeado.
 * Run: npx tsx src/lib/obs/rate-limit-redis.test.ts
 */

import { rateLimitRedis, isRedisRateLimitConfigured } from "./rate-limit-redis";

function eq(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function truthy(v: unknown, label: string) {
  if (!v) throw new Error(`${label} (expected truthy, got ${JSON.stringify(v)})`);
}

const ORIG_FETCH = globalThis.fetch;

function mockFetch(handler: (url: string, body: unknown[][]) => unknown[] | Error) {
  globalThis.fetch = (async (input: unknown, init?: { body?: string }) => {
    const url = typeof input === "string" ? input : (input as { url: string }).url;
    const body = init?.body ? JSON.parse(init.body) : [];
    const result = handler(url, body);
    if (result instanceof Error) throw result;
    return {
      ok: true,
      json: async () => result.map((r) => ({ result: r })),
    } as Response;
  }) as typeof fetch;
}

function unmock() {
  globalThis.fetch = ORIG_FETCH;
}

async function run() {
  let passed = 0, failed = 0;
  const tests: Array<[string, () => Promise<void>]> = [
    ["isConfigured: false sin env vars", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      eq(isRedisRateLimitConfigured(), false, "no configurado");
    }],

    ["isConfigured: true con env vars", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token-1234567890";
      eq(isRedisRateLimitConfigured(), true, "configurado");
    }],

    ["rateLimitRedis devuelve null si no configurado", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      const r = await rateLimitRedis("k1", 5, 60);
      eq(r, null, "null cuando falta env");
    }],

    ["allow path: count < limit", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token-1234567890";
      // Lua devuelve [allowedFlag=1, count=3 (post-ZADD), now]
      mockFetch(() => [[1, 3, Date.now()]]);
      const r = await rateLimitRedis("k2", 5, 60);
      truthy(r, "no null");
      eq(r!.allowed, true, "allowed");
      eq(r!.remaining, 2, "5 - 3 = 2 remaining");
      unmock();
    }],

    ["block path: count >= limit (NO añade hit)", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token-1234567890";
      const oldestScore = Date.now() - 5000;
      // Lua devuelve [allowedFlag=0, count=5 (pre-ZADD; NO añadió), oldestScore]
      mockFetch(() => [[0, 5, oldestScore]]);
      const r = await rateLimitRedis("k3", 5, 60);
      truthy(r, "no null");
      eq(r!.allowed, false, "blocked");
      eq(r!.remaining, 0, "0 remaining");
      // resetAt = oldestScore + windowMs (60s)
      eq(r!.resetAt, oldestScore + 60000, "resetAt = oldest + window");
      unmock();
    }],

    ["devuelve null si fetch falla", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token-1234567890";
      mockFetch(() => new Error("network down"));
      const r = await rateLimitRedis("k4", 5, 60);
      eq(r, null, "null en error → fallback a memory");
      unmock();
    }],

    ["devuelve null si response.ok = false", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token-1234567890";
      globalThis.fetch = (async () => ({ ok: false, json: async () => [] }) as Response) as typeof fetch;
      const r = await rateLimitRedis("k5", 5, 60);
      eq(r, null, "null en HTTP error");
      unmock();
    }],
  ];

  for (const [name, fn] of tests) {
    try {
      await fn();
      passed++;
      console.log(`  ok ${name}`);
    } catch (err) {
      failed++;
      console.error(`  FAIL ${name}\n    ${(err as Error).message}`);
    }
  }
  console.log(`\nrate-limit-redis: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().finally(unmock);
