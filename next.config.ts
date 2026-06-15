import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Security headers aplicados a toda respuesta.
 *  - X-Frame-Options DENY: anti-clickjacking.
 *  - X-Content-Type-Options nosniff: anti MIME-confusion.
 *  - Referrer-Policy strict-origin-when-cross-origin.
 *  - Permissions-Policy: bloquea features no usadas.
 *  - HSTS 2 años incl. subdominios.
 *  - CSP: protección XSS a nivel superficie.
 */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next 16 requiere 'unsafe-inline' para runtime scripts; 'unsafe-eval' por
      // compat con Sentry+PostHog. Trimmar cuando se pueda.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://*.posthog.com https://*.i.posthog.com https://www.clarity.ms https://*.clarity.ms",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://va.vercel-scripts.com https://vercel.live https://*.sentry.io https://*.posthog.com https://*.i.posthog.com https://*.clarity.ms",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
      "report-uri /api/csp-report",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Pin del workspace root para Turbopack (evita confusión con lockfiles vecinos).
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

/**
 * Sentry wrap — el upload de source-maps solo corre con SENTRY_AUTH_TOKEN +
 * SENTRY_ORG/PROJECT; sin ellos el wrapper pasa de largo (no rompe el build).
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  widenClientFileUpload: false,
  automaticVercelMonitors: false,
});
