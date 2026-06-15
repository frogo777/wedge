/**
 * Sentry Node.js (server runtime) initialization.
 *
 * Loaded by `instrumentation.ts#register` when NEXT_RUNTIME === "nodejs".
 * Gated by `SENTRY_DSN`. If unset we no-op so the build/deploy doesn't
 * fail when the user hasn't signed up for Sentry yet.
 *
 * Sample rates intentionally conservative — the free tier is 5k events/mo.
 */
import * as Sentry from "@sentry/nextjs";
import { redactSentryEvent } from "@/lib/obs/sentry-redact";

const DSN = process.env.SENTRY_DSN;

if (DSN) {
  const isProd = process.env.NODE_ENV === "production";
  Sentry.init({
    dsn: DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    // QA spec 2026-05-26: 1.0 dev, 0.2 prod.
    tracesSampleRate: isProd ? 0.2 : 1.0,
    // Don't autodiscover, we'll add manual spans for hot paths.
    enabled: process.env.NODE_ENV === "production",
    // PII redaction: strip emails, RFCs, CURPs, tokens, JWTs antes de enviar.
    // Cumple LFPDPPP Art. 13 (proporcionalidad).
    sendDefaultPii: false,
    beforeSend: redactSentryEvent,
  });
} else if (process.env.NODE_ENV !== "production" && !globalThis.__wedgeSentryServerWarned) {
  globalThis.__wedgeSentryServerWarned = true;
   
  console.info("[sentry] SENTRY_DSN not set — server error tracking disabled.");
}

declare global {
   
  var __wedgeSentryServerWarned: boolean | undefined;
}
