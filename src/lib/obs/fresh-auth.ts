/**
 * Server-side session freshness check.
 *
 * Modelo de amenaza: el user logueado deja la sesión abierta semanas (las
 * cookies de Supabase duran 30 días por default). Si alguien obtiene
 * acceso al device (tablet del trabajo compartido, laptop robada con
 * sesión activa), puede ejecutar acciones sensibles sin re-prompt.
 *
 * Defensa: para acciones sensibles requerir que el last_sign_in_at del
 * user esté dentro de un umbral reciente. Si excede → 403 con flag
 * `re-auth-required` que el frontend muestra como prompt de re-login.
 *
 * Diferentes umbrales por sensibilidad:
 *   - 10 min: delete account, export PII (acción irreversible / pesada)
 *   - 4 horas: billing checkout/portal, SAT credenciales (dinero / acceso)
 *   - 8 horas: cambios de profile data sensible (RFC, régimen — vía UI)
 *
 * NOTA — SENSITIVE subido de 30 min a 4 horas (sept 2026): el threshold
 * original mataba conversion. Caso típico: user entra al sitio, ve precios,
 * piensa, regresa después del lunch → 30 min después ya no puede comprar
 * sin re-login. Stripe ya hace 3DS y exige datos de tarjeta completos en
 * cada checkout (no podemos tener tarjeta saved sin 3DS), así que el riesgo
 * "robar device" en este threshold es bajo. El ataque real (acceso físico
 * al device) se mitiga con CRITICAL en delete-account.
 *
 * Implementación: usa `user.last_sign_in_at` que Supabase actualiza
 * en cada login (password, OAuth, magic link). Refresh tokens NO lo
 * actualizan — eso es deseable: queremos exigir login real, no solo
 * que la sesión esté renovada.
 */

import type { User } from "@supabase/supabase-js";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

export const FRESH_AUTH_THRESHOLDS = {
  /** Acciones irreversibles: delete cuenta, export full data. */
  CRITICAL: 10 * MIN,
  /** Dinero / acceso: billing, conectar credenciales SAT. */
  SENSITIVE: 4 * HOUR,
  /** Cambios de profile sensible. */
  STANDARD: 8 * HOUR,
} as const;

export type FreshnessLevel = keyof typeof FRESH_AUTH_THRESHOLDS;

/**
 * Verifica que el user se autenticó dentro del umbral. Devuelve `null`
 * si está fresh, `Response` 403 si no.
 */
export function requireFreshAuth(
  user: User | null,
  level: FreshnessLevel,
): Response | null {
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const lastSignInAt = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).getTime()
    : 0;
  if (!lastSignInAt) {
    // Sin timestamp = no podemos verificar freshness. Conservador: rechazar.
    return Response.json(
      {
        error: "re-auth-required",
        reason: "no_last_sign_in",
        message: "Inicia sesión de nuevo para continuar.",
      },
      { status: 403 },
    );
  }

  const ageMs = Date.now() - lastSignInAt;
  const threshold = FRESH_AUTH_THRESHOLDS[level];

  if (ageMs > threshold) {
    const thresholdHours = Math.floor(threshold / HOUR);
    const thresholdLabel = thresholdHours >= 1
      ? `${thresholdHours} ${thresholdHours === 1 ? "hora" : "horas"}`
      : `${Math.floor(threshold / MIN)} min`;
    return Response.json(
      {
        error: "re-auth-required",
        reason: "session_too_old",
        ageMs,
        threshold,
        message: `Por seguridad, inicia sesión de nuevo para continuar (tu última sesión es de hace más de ${thresholdLabel}).`,
      },
      { status: 403 },
    );
  }

  return null;
}
