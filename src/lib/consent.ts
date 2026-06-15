/**
 * Consentimiento de cookies / analytics — LFPDPPP + best practice EU.
 *
 * Estrategia simple opt-in:
 *   - Default: solo cookies necesarias (auth de Supabase). Sin analytics.
 *   - Banner pide consentimiento explícito para "Analíticas y mejoras".
 *   - Sentry (error tracking) se considera "necesario" para operar la app y
 *     se activa siempre, pero con `beforeSend` que redacta PII.
 *   - PostHog (analytics + autocapture + session tokens) requiere consent.
 *
 * Persiste decisión en localStorage. Cuando no hay decisión todavía, los
 * gates devuelven `false` (equivalente a "denegar" por default).
 */

const KEY = "wedge:consent:v1";

export type ConsentValue = "accepted" | "rejected" | "unset";

export interface ConsentState {
  analytics: ConsentValue;
  decidedAt: string | null;
}

const DEFAULT_STATE: ConsentState = {
  analytics: "unset",
  decidedAt: null,
};

export function getConsent(): ConsentState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    if (parsed.analytics === "accepted" || parsed.analytics === "rejected") {
      return {
        analytics: parsed.analytics,
        decidedAt: typeof parsed.decidedAt === "string" ? parsed.decidedAt : null,
      };
    }
  } catch {
    /* corrupted localStorage — tratar como no decidido */
  }
  return DEFAULT_STATE;
}

export function setConsent(value: "accepted" | "rejected"): void {
  if (typeof window === "undefined") return;
  try {
    const state: ConsentState = {
      analytics: value,
      decidedAt: new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(state));
    // Notificar a listeners (ej. PostHogProvider) para activar/desactivar.
    window.dispatchEvent(new CustomEvent("wedge:consent-changed", { detail: state }));
  } catch {
    /* localStorage no disponible — silently fail */
  }
}

export function hasDecidedConsent(): boolean {
  return getConsent().analytics !== "unset";
}

export function isAnalyticsAllowed(): boolean {
  return getConsent().analytics === "accepted";
}
