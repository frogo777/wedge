/**
 * PostHog client initialization.
 *
 * Gated by `NEXT_PUBLIC_POSTHOG_KEY`. If unset, every export becomes a graceful
 * no-op so the app runs identically without observability configured.
 *
 * Privacy posture:
 *  - autocapture: ON (lets PostHog collect clicks/forms automatically)
 *  - session_recording: OFF (we don't want to record SAT/CFDI screens)
 *  - capture_pageview: ON
 *
 * Identify the user only after auth — see `posthog-provider.tsx`.
 */

"use client";

import posthog from "posthog-js";

let _initialized = false;

export function isPosthogEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

export function initPosthog(): void {
  if (typeof window === "undefined") return;
  if (_initialized) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  posthog.init(key, {
    api_host: host,
    // Autocapture limitado: clicks en elementos interactivos OK, pero
    // NO el contenido de inputs (PII como email/RFC podrían capturarse).
    autocapture: {
      // Excluir cualquier input/textarea — sus values pueden contener PII.
      // Conservamos clicks en botones/links que es lo útil para producto.
      dom_event_allowlist: ["click"],
      element_attribute_ignorelist: ["data-personal", "data-rfc", "data-email"],
    },
    capture_pageview: true,
    disable_session_recording: true,
    // Default mask all text inputs and elements with class `ph-no-capture`.
    mask_all_text: false,            // mantenemos labels legibles
    mask_personal_data_properties: true,
    sanitize_properties: (props, _eventName) => {
      // Defensa en profundidad: scrub valores que parecen PII antes de
      // mandar a PostHog. Recursivo para objects anidados; rechaza por key
      // (email/rfc/curp/token) y por contenido (regex).
      const EMAIL_RX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const RFC_RX   = /\b([A-ZÑ&]{3,4})\d{6}[A-Z0-9]{3}\b/gi;
      const CURP_RX  = /\b[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}\b/gi;
      const PII_KEYS = new Set([
        "email","correo","rfc","curp","password","contrasena",
        "token","access_token","refresh_token","authorization","cookie",
      ]);
      const scrub = (v: unknown, keyHint?: string): unknown => {
        if (v == null) return v;
        if (keyHint && PII_KEYS.has(keyHint.toLowerCase())) return "[REDACTED]";
        if (typeof v === "string") {
          return v
            .replace(EMAIL_RX, "[REDACTED_EMAIL]")
            .replace(RFC_RX, "[REDACTED_RFC]")
            .replace(CURP_RX, "[REDACTED_CURP]");
        }
        if (typeof v === "number" || typeof v === "boolean") return v;
        if (Array.isArray(v)) return v.map((x) => scrub(x));
        if (typeof v === "object") {
          const out: Record<string, unknown> = {};
          for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
            out[k] = scrub(val, k);
          }
          return out;
        }
        return v;
      };
      return scrub(props || {}) as Record<string, unknown>;
    },
    persistence: "localStorage+cookie",
    loaded: (ph) => {
      // Respect Do Not Track if set by the browser.
      if (
        typeof navigator !== "undefined" &&
        (navigator.doNotTrack === "1" ||
          (navigator as Navigator & { msDoNotTrack?: string }).msDoNotTrack === "1")
      ) {
        ph.opt_out_capturing();
      }
    },
  });

  _initialized = true;
}

export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>
): void {
  if (!_initialized) return;
  try {
    posthog.identify(userId, traits);
  } catch {
    /* swallow */
  }
}

export function resetPosthog(): void {
  if (!_initialized) return;
  try {
    posthog.reset();
  } catch {
    /* swallow */
  }
}

export function captureEvent(
  event: string,
  props?: Record<string, unknown>
): void {
  if (!_initialized) return;
  try {
    posthog.capture(event, props);
  } catch {
    /* swallow */
  }
}

/**
 * AARRR funnel events — typed helpers para evitar drift de event names.
 *
 *   Acquisition: signup_completed
 *   Activation:  onboarding_completed, sat_connected, first_cfdi_imported
 *   Retention:   first_declaration_viewed, returning_session
 *   Revenue:     checkout_started, checkout_completed, subscription_canceled
 *   Referral:    referral_link_shared, referral_signup
 *
 * Cada evento se loggea con props mínimas relevantes — nada de PII.
 * Si PostHog no está inicializado (anon visitor, dev local sin key),
 * los calls son no-op silenciosos.
 */
export const aarrr = {
  signupCompleted: (method: "email" | "google" = "email") =>
    captureEvent("signup_completed", { method }),

  onboardingCompleted: (props: { regimen: string | null; persona: string | null; ingreso_mensual: number | null }) =>
    captureEvent("onboarding_completed", props),

  satConnected: (provider: "syntage" | "belvo" | "ciec" | "manual" = "syntage") =>
    captureEvent("sat_connected", { provider }),

  firstCfdiImported: (count: number, source: string) =>
    captureEvent("first_cfdi_imported", { count, source }),

  firstDeclarationViewed: (period: string, total: number) =>
    captureEvent("first_declaration_viewed", { period, total }),

  checkoutStarted: (plan: "pro" | "business", cadence: "monthly" | "annual") =>
    captureEvent("checkout_started", { plan, cadence }),

  checkoutCompleted: (plan: "pro" | "business") =>
    captureEvent("checkout_completed", { plan }),

  subscriptionCanceled: (plan: "pro" | "business", reason?: string) =>
    captureEvent("subscription_canceled", { plan, reason: reason ?? null }),

  // Marketing funnel — pre-signup actions que importan medir desde TikTok/SEO.
  betaApplied: (props: { regimen: string | null; actividad: string | null; ingreso: string | null }) =>
    captureEvent("beta_applied", props),

  calculadoraUsed: (props: { regimen: string; ingreso: number; isr_calculado: number }) =>
    captureEvent("calculadora_isr_used", props),

  vsPageViewed: (competitor: string) =>
    captureEvent("vs_page_viewed", { competitor }),

  feedbackSubmitted: (kind: "bug" | "idea" | "praise" | "other") =>
    captureEvent("feedback_submitted", { kind }),

  leadEmailCaptured: (source: string, regimen: string | null) =>
    captureEvent("lead_email_captured", { source, regimen }),
};
