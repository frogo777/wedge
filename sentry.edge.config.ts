/**
 * Sentry edge runtime initialization (used by middleware and edge route
 * handlers). Gated by `SENTRY_DSN`. No-ops when unset.
 */
import * as Sentry from "@sentry/nextjs";
import { redactSentryEvent } from "@/lib/obs/sentry-redact";

const DSN = process.env.SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    enabled: process.env.NODE_ENV === "production",
    sendDefaultPii: false,
    beforeSend: redactSentryEvent,
  });
}
