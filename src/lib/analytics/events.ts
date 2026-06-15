/**
 * UX-funnel events (Sprint 0 — May 2026).
 *
 * Complementa los eventos AARRR de `src/lib/posthog.ts` con eventos
 * específicos del funnel de conversión + activación que estamos midiendo
 * para validar Sprint 1+2 del UX Roadmap.
 *
 * Cada helper es un no-op silencioso si PostHog no está inicializado
 * (DSN ausente, consent rechazado, DNT activo). NUNCA loguea PII.
 */

"use client";

import { captureEvent } from "@/lib/posthog";

/* ─── Funnel de conversión landing → primera declaración ──────────── */

export const funnel = {
  /** Llamado automáticamente por capture_pageview de PostHog. Wrapper para
   *  poder agregar props custom (utm, referrer parsing, etc). */
  pageViewed: (path: string, extra?: { referrer?: string; utm_source?: string }) =>
    captureEvent("page_viewed", { path, ...(extra ?? {}) }),

  /** Click en cualquier CTA tracked. `location` describe la sección
   *  (hero/pricing/feature-x). Usado para A/B testing y heatmaps. */
  ctaClicked: (props: {
    cta_id: string;
    cta_text: string;
    location: string;
    variant?: string;
  }) => captureEvent("cta_clicked", props),

  /** User inicia la calculadora publica, antes de pedir cuenta. */
  calculatorStarted: (props: { source: string }) =>
    captureEvent("calculator_started", props),

  /** User abre o navega hacia el demo fiscal explicativo. */
  demoViewed: (props: { source: string; variant?: string }) =>
    captureEvent("demo_viewed", props),

  /** User abre el explicador de seguridad/credenciales SAT. */
  securityExplainerViewed: (props: { source: string }) =>
    captureEvent("security_explainer_viewed", props),

  /** User llegó a /signup. Diferente de `signup_completed` (post-form). */
  signupStarted: () => captureEvent("signup_started"),

  /** User completó signup y verificó email. `aarrr.signupCompleted`
   *  cubre el lado de revenue; este es el lado UX. */
  signupCompleted: (props?: { plan?: "free" | "pro" | "business" }) =>
    captureEvent("signup_completed_ux", props ?? {}),

  /** SAT conectado por primera vez. */
  satConnected: (provider: "syntage" | "belvo" | "ciec" | "manual") =>
    captureEvent("sat_connected", { provider }),

  /** Primer CFDI visible en /facturas (cualquier source). */
  firstCfdiLoaded: (props: { count: number; source: string }) =>
    captureEvent("first_cfdi_loaded", props),

  /** Primera vez que el user ve un cálculo de ISR/IVA con datos suyos. */
  firstCalculationViewed: (props: { period: string; total: number }) =>
    captureEvent("first_calculation_viewed", props),

  /** El aha moment definitivo: declaración marcada como pagada. */
  firstDeclarationPaid: (props: {
    period: string;
    total: number;
    time_to_complete_min: number;
  }) => captureEvent("first_declaration_paid", props),

  /** User abandonó el flujo de declaración a mitad. `step` identifica
   *  dónde (review/sat-redirect/mark-paid/etc). */
  declarationAbandoned: (props: { period: string; step: string }) =>
    captureEvent("declaration_abandoned", props),
};

/* ─── luk engagement ──────────────────────────────────────────────── */

export const luk = {
  messageSent: (props: { message_length: number; has_action?: boolean }) =>
    captureEvent("luk_message_sent", props),

  /** User calificó una respuesta de luk con 👍/👎. Instrumento de calidad. */
  feedbackGiven: (props: { rating: 1 | -1 }) =>
    captureEvent("luk_feedback", props),

  /** User expandió una cita legal (Art. X LISR → modal con explicación). */
  citaExpanded: (props: { article: string; surface: "luk" | "breakdown" | "calc" | "landing" }) =>
    captureEvent("luk_cita_expanded", props),

  /** User compartió una respuesta de luk (Sprint 2 S2.6). */
  responseShared: (props: { channel: "copy" | "twitter" | "whatsapp" | "native_share" }) =>
    captureEvent("luk_response_shared", props),
};

/* ─── Pricing & upgrade ───────────────────────────────────────────── */

export const pricing = {
  planUpgradeClicked: (props: {
    from_plan: "free" | "pro";
    to_plan: "pro" | "business";
    location: string;
  }) => captureEvent("plan_upgrade_clicked", props),

  pricingPageScrolledToBottom: () =>
    captureEvent("pricing_scrolled_to_bottom"),
};

/* ─── NPS / VoC (Sprint 0 S0.4) ───────────────────────────────────── */

export const nps = {
  surveyShown: () => captureEvent("nps_survey_shown"),
  surveyAnswered: (props: { score: number; has_comment: boolean }) =>
    captureEvent("nps_survey_answered", props),
  surveyDismissed: () => captureEvent("nps_survey_dismissed"),
};
