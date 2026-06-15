/**
 * Sentry browser SDK initialization.
 *
 * Loaded by `instrumentation-client.ts` on the client. Gated by
 * `NEXT_PUBLIC_SENTRY_DSN` (must be public — the browser bundle reads it).
 * If the DSN is unset (the default until the user signs up for Sentry),
 * we no-op silently so dev mode stays clean and production deploys without
 * a Sentry account don't crash.
 *
 * BrowserTracing + Replay are enabled with conservative sample rates:
 *   - tracesSampleRate: 10% (page loads + navigations)
 *   - replaysSessionSampleRate: 0 (no recordings of normal sessions)
 *   - replaysOnErrorSampleRate: 10% (10% of error sessions get replay)
 *
 * The existing PII-stripping logger in `src/lib/obs/logger.ts` runs in
 * parallel — Sentry receives the raw exception, the logger redacts emails
 * and RFCs before the JSON line hits stdout.
 */
import * as Sentry from "@sentry/nextjs";
import { redactSentryEvent } from "@/lib/obs/sentry-redact";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  const isProd = process.env.NODE_ENV === "production";
  Sentry.init({
    dsn: DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development",
    // QA spec 2026-05-26: 1.0 dev (verás todo localmente), 0.2 prod
    // (5x el sampling anterior — cabe en free tier con <1K visits/día).
    tracesSampleRate: isProd ? 0.2 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Don't ship transactions or breadcrumbs in dev unless someone really
    // wants them — keeps the dev console quiet.
    enabled: process.env.NODE_ENV === "production",
    // PII redaction: emails/RFCs/CURPs/tokens en error messages.
    sendDefaultPii: false,
    beforeSend: redactSentryEvent,
  });
} else if (process.env.NODE_ENV !== "production") {
  // One-shot dev hint. Don't spam.
  if (typeof window !== "undefined" && !(window as unknown as { __wedgeSentryWarned?: boolean }).__wedgeSentryWarned) {
    (window as unknown as { __wedgeSentryWarned?: boolean }).__wedgeSentryWarned = true;
     
    console.info("[sentry] NEXT_PUBLIC_SENTRY_DSN not set — error tracking disabled.");
  }
}
