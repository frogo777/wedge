/**
 * Tests for sentry-redact `beforeSend` hook.
 * Run: npx tsx src/lib/obs/sentry-redact.test.ts
 */

import { redactSentryEvent } from "./sentry-redact";
import type { ErrorEvent } from "@sentry/nextjs";

function eq(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`,
    );
  }
}

function contains(haystack: unknown, needle: string, label: string) {
  const s = typeof haystack === "string" ? haystack : JSON.stringify(haystack);
  if (!s.includes(needle)) {
    throw new Error(`${label}\n  expected to contain "${needle}"\n  got: ${s}`);
  }
}

function notContains(haystack: unknown, needle: string, label: string) {
  const s = typeof haystack === "string" ? haystack : JSON.stringify(haystack);
  if (s.includes(needle)) {
    throw new Error(`${label}\n  expected NOT to contain "${needle}"\n  got: ${s}`);
  }
}

const TESTS: Array<[string, () => void]> = [
  ["redacta email del exception.value", () => {
    const ev: ErrorEvent = {
      type: undefined,
      exception: {
        values: [
          { type: "Error", value: "User not found: karim@example.com" },
        ],
      },
    } as ErrorEvent;
    const out = redactSentryEvent(ev);
    contains(out!.exception!.values![0].value, "[REDACTED_EMAIL]", "email redacted");
    notContains(out, "karim@example.com", "raw email gone");
  }],

  ["redacta RFC y CURP", () => {
    const ev: ErrorEvent = {
      type: undefined,
      exception: {
        values: [{ type: "Error", value: "RFC LOAN900101XX1 inválido CURP LOAN900101HCMNNN09" }],
      },
    } as ErrorEvent;
    const out = redactSentryEvent(ev);
    notContains(out, "LOAN900101XX1", "RFC removed");
    contains(out!.exception!.values![0].value, "[REDACTED_RFC]", "RFC marker");
    contains(out!.exception!.values![0].value, "[REDACTED_CURP]", "CURP marker");
  }],

  ["redacta tokens (Bearer, sk-, JWT)", () => {
    const ev: ErrorEvent = {
      type: undefined,
      exception: {
        values: [{ type: "Error", value: "auth failed Bearer abc123def456ghi789jkl012mno345pq" }],
      },
    } as ErrorEvent;
    const out = redactSentryEvent(ev);
    notContains(out!.exception!.values![0].value, "abc123def456ghi789jkl012mno345pq", "token gone");
  }],

  ["elimina user.email", () => {
    const ev: ErrorEvent = {
      type: undefined,
      user: { id: "uuid-123", email: "test@x.com", ip_address: "1.2.3.4" },
    } as ErrorEvent;
    const out = redactSentryEvent(ev);
    eq(out!.user!.email, undefined, "email gone");
    eq(out!.user!.ip_address, undefined, "ip gone");
    eq(out!.user!.id, "uuid-123", "id preserved");
  }],

  ["elimina request.cookies y authorization header", () => {
    const ev: ErrorEvent = {
      type: undefined,
      request: {
        cookies: { session: "secret" },
        headers: {
          authorization: "Bearer xyz",
          cookie: "sb-token=abc",
          "user-agent": "Mozilla/5.0",
        },
      },
    } as unknown as ErrorEvent;
    const out = redactSentryEvent(ev);
    eq(out!.request!.cookies, undefined, "cookies stripped");
    const h = out!.request!.headers as Record<string, unknown>;
    eq(h.authorization, undefined, "authz stripped");
    eq(h.cookie, undefined, "cookie stripped");
    eq(h["user-agent"], "Mozilla/5.0", "non-PII header preserved");
  }],

  ["redacta query_string con email", () => {
    const ev: ErrorEvent = {
      type: undefined,
      request: { query_string: "user=admin@x.com&id=123" },
    } as ErrorEvent;
    const out = redactSentryEvent(ev);
    notContains(out!.request!.query_string, "admin@x.com", "email in qs gone");
  }],

  ["redacta breadcrumbs.data y .message", () => {
    const ev: ErrorEvent = {
      type: undefined,
      breadcrumbs: [
        { message: "Login attempt for user@x.com", data: { email: "user@x.com", id: 5 } },
      ],
    } as ErrorEvent;
    const out = redactSentryEvent(ev);
    notContains(out!.breadcrumbs![0].message, "user@x.com", "bc msg redacted");
    eq((out!.breadcrumbs![0].data as Record<string, unknown>).email, "[REDACTED]", "bc.data.email redacted by key");
  }],

  ["redacta extra con keys PII", () => {
    const ev: ErrorEvent = {
      type: undefined,
      extra: { rfc: "LOAN900101XX1", token: "secret123", payload: "ok" },
    } as ErrorEvent;
    const out = redactSentryEvent(ev);
    eq(out!.extra!.rfc, "[REDACTED]", "rfc by key");
    eq(out!.extra!.token, "[REDACTED]", "token by key");
    eq(out!.extra!.payload, "ok", "non-PII preserved");
  }],

  ["evento sin PII pasa intacto", () => {
    const ev: ErrorEvent = {
      type: undefined,
      exception: { values: [{ type: "TypeError", value: "Cannot read property foo of null" }] },
    } as ErrorEvent;
    const out = redactSentryEvent(ev);
    eq(out!.exception!.values![0].value, "Cannot read property foo of null", "untouched");
  }],

  ["redacta event.message top-level (captureMessage)", () => {
    const ev: ErrorEvent = {
      type: undefined,
      message: "user signup failed for foo@bar.com",
    } as ErrorEvent;
    const out = redactSentryEvent(ev);
    notContains(out!.message, "foo@bar.com", "email gone from message");
    contains(out!.message, "[REDACTED_EMAIL]", "marker present");
  }],

  ["depth limit previene stack overflow con structure profunda", () => {
    // Construir objeto con depth 20 — debe truncarse en MAX_DEPTH=8
    type Deep = { next?: Deep; email?: string };
    const deep: Deep = { email: "leaf@x.com" };
    let cur = deep;
    for (let i = 0; i < 20; i++) {
      cur.next = { email: `n${i}@x.com` };
      cur = cur.next;
    }
    const ev: ErrorEvent = {
      type: undefined,
      extra: { deep },
    } as unknown as ErrorEvent;
    // No debe lanzar (sin depth limit habría stack overflow para structs
    // arbitrariamente profundos, aunque 20 niveles no lo causa, valida el path).
    const out = redactSentryEvent(ev);
    // El JSON.stringify del out debe completar sin throw.
    const s = JSON.stringify(out);
    if (s.length === 0) throw new Error("output vacío");
    // Niveles más allá de MAX_DEPTH se reemplazan con marker.
    contains(s, "[REDACTED_DEPTH]", "depth marker presente");
  }],

  ["preserva user.id (UUID no es PII directa)", () => {
    const ev: ErrorEvent = {
      type: undefined,
      user: { id: "550e8400-e29b-41d4-a716-446655440000", email: "x@y.com" },
    } as ErrorEvent;
    const out = redactSentryEvent(ev);
    eq(out!.user!.id, "550e8400-e29b-41d4-a716-446655440000", "id intact");
    eq(out!.user!.email, undefined, "email gone");
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
console.log(`\nsentry-redact: ${passed} passed, ${failed} failed`);
if (failed > 0 && typeof process !== "undefined") process.exit(1);
