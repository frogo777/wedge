/**
 * Next.js 16 client instrumentation hook. Runs after HTML loads but before
 * React hydration — ideal for wiring error tracking before users interact.
 *
 * The client Sentry init is gated on NEXT_PUBLIC_SENTRY_DSN inside
 * sentry.client.config.ts.
 */
import * as Sentry from "@sentry/nextjs";
import "./sentry.client.config";

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
