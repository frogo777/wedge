/**
 * Next.js 16 instrumentation hook. Runs once when the server boots.
 *
 * We load the runtime-specific Sentry config dynamically so the Edge bundle
 * doesn't pull in the Node SDK and vice versa. Both configs are gated on
 * `SENTRY_DSN` internally — if the env var is unset the import side-effects
 * are no-ops.
 *
 * `onRequestError` forwards Server Component / Route Handler / Server Action
 * errors to Sentry per Next 16 conventions. It runs alongside the existing
 * `/api/errors` POST sink and the PII-stripping logger.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
