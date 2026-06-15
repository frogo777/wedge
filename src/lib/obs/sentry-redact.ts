/**
 * `beforeSend` hook compartido para Sentry — redacta PII antes de enviar.
 *
 * Por qué existe: aunque nuestro logger interno redacta `error.message` y
 * `error.stack`, las llamadas directas a `Sentry.captureException(err)`
 * pueden subir el Error original con email/RFC/CURP/passwords embebidos.
 * Este hook se ejecuta para CADA evento que Sentry está por enviar y
 * limpia campos PII conocidos.
 *
 * Cumple LFPDPPP Art. 13 (principio de proporcionalidad — solo recolectar
 * datos estrictamente necesarios para la finalidad).
 */

import type { EventHint, ErrorEvent } from "@sentry/nextjs";

const EMAIL_RX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const RFC_RX   = /\b([A-ZÑ&]{3,4})\d{6}[A-Z0-9]{3}\b/gi;
const CURP_RX  = /\b[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}\b/gi;
// Tokens / API keys con prefijos comunes
const TOKEN_RX = /\b(sk-[A-Za-z0-9_-]{20,}|pk_live_[A-Za-z0-9]{20,}|sk_live_[A-Za-z0-9]{20,}|GOCSPX-[A-Za-z0-9_-]{20,}|whsec_[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._-]{20,})/g;
// JWTs (3 segmentos b64 separados por punto)
const JWT_RX   = /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\b/g;

const PII_KEYS = new Set([
  "email", "correo", "rfc", "curp",
  "password", "contrasena", "contrasena_actual",
  "token", "access_token", "refresh_token",
  "authorization", "cookie", "set-cookie",
  "ciec", "fiel", "private_key",
]);

function redactString(s: string): string {
  return s
    .replace(EMAIL_RX, "[REDACTED_EMAIL]")
    .replace(RFC_RX, "[REDACTED_RFC]")
    .replace(CURP_RX, "[REDACTED_CURP]")
    .replace(TOKEN_RX, "[REDACTED_TOKEN]")
    .replace(JWT_RX, "[REDACTED_JWT]");
}

// Depth limit defensivo: Sentry no debería pasar estructuras circulares
// (ya las serializa con `safeMaybeJSONStringify`), pero limitamos para
// prevenir stack overflow ante un payload patológico.
const MAX_DEPTH = 8;

function redactValue(v: unknown, keyHint?: string, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[REDACTED_DEPTH]";
  if (v == null) return v;
  if (keyHint && PII_KEYS.has(keyHint.toLowerCase())) return "[REDACTED]";
  if (typeof v === "string") return redactString(v);
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.map((x) => redactValue(x, undefined, depth + 1));
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = redactValue(val, k, depth + 1);
    }
    return out;
  }
  return v;
}

/** Aplica redacción a una propiedad string in-place si existe. */
function redactStringProp(obj: Record<string, unknown> | undefined, key: string): void {
  if (!obj) return;
  const v = obj[key];
  if (typeof v === "string") obj[key] = redactString(v);
}

/**
 * Redacta PII en un evento Sentry. Mutate-in-place + return event.
 * Compatible con la signature `beforeSend` de Sentry SDK.
 */
export function redactSentryEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
  // event.message — top-level usado por captureMessage(). Si bien el
  // SDK suele pasarlo a exception.values[0].value, en algunos paths
  // (ej. fingerprinting custom) el message queda en el top-level.
  if (typeof event.message === "string") {
    event.message = redactString(event.message);
  }

  // user.email, user.username — bajo ningún caso enviar.
  if (event.user) {
    delete event.user.email;
    delete event.user.username;
    delete event.user.ip_address;
    // user.id se conserva (es UUID, no PII directa) si fue seteado.
  }

  // request.cookies, request.headers — strip authorization & cookie.
  if (event.request) {
    if (event.request.cookies) delete event.request.cookies;
    if (event.request.headers) {
      const h = event.request.headers as Record<string, unknown>;
      delete h.authorization;
      delete h.cookie;
      delete h["set-cookie"];
      // Otros headers se redactan por strings.
      event.request.headers = redactValue(h) as typeof event.request.headers;
    }
    if (event.request.query_string && typeof event.request.query_string === "string") {
      event.request.query_string = redactString(event.request.query_string);
    }
    if (event.request.url && typeof event.request.url === "string") {
      event.request.url = redactString(event.request.url);
    }
  }

  // exception.values[].value — el mensaje del error
  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      redactStringProp(ex as unknown as Record<string, unknown>, "value");
      // Stack frames: vars locales pueden tener PII.
      if (ex.stacktrace?.frames) {
        for (const frame of ex.stacktrace.frames) {
          if (frame.vars) frame.vars = redactValue(frame.vars) as typeof frame.vars;
        }
      }
    }
  }

  // breadcrumbs — pueden tener URLs con email en query strings, payloads de fetch
  if (event.breadcrumbs) {
    for (const bc of event.breadcrumbs) {
      if (bc.message) bc.message = redactString(bc.message);
      if (bc.data) bc.data = redactValue(bc.data) as typeof bc.data;
    }
  }

  // extra & contexts (lo que pasamos via captureException(err, { extra: {...} }))
  if (event.extra) event.extra = redactValue(event.extra) as typeof event.extra;
  if (event.contexts) event.contexts = redactValue(event.contexts) as typeof event.contexts;
  if (event.tags) event.tags = redactValue(event.tags) as typeof event.tags;

  return event;
}
