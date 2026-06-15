/**
 * Lightweight structured logger for Wedge.
 *
 * - JSON output in production (easy to ship to any log aggregator).
 * - Pretty output in development.
 * - Strips PII (email, RFC) from context before logging.
 */

const IS_DEV = process.env.NODE_ENV !== "production";
const ENV = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";

const PII_KEYS = new Set([
  "email",
  "correo",
  "rfc",
  "curp",
  "password",
  "contrasena",
  "contrasena_actual",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "cookie",
  "set-cookie",
  // SAT-specific (Security audit 2026-05-27): nunca logear CIEC ni FIEL
  // bajo NINGÚN circunstancia. Estas claves dan acceso al SAT como user.
  "ciec",
  "ciec_password",
  "fiel",
  "efirma",
  "e_firma",
  "private_key",
  "cer",
  "key_password",
  "stripe_signature",
  "internal_api_token",
  "syntage_webhook_secret",
  "sat_credentials_key",
]);

// crude regexes used to catch obvious PII embedded inside string values
const EMAIL_RX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Mexican RFC pattern (4 letters + 6 digits + 3 alphanumerics, allow 3-letter Moral variant)
const RFC_RX = /\b([A-ZÑ&]{3,4})\d{6}[A-Z0-9]{3}\b/gi;

function redactString(s: string): string {
  return s.replace(EMAIL_RX, "[REDACTED_EMAIL]").replace(RFC_RX, "[REDACTED_RFC]");
}

function redactValue(v: unknown, keyHint?: string): unknown {
  if (v == null) return v;
  if (keyHint && PII_KEYS.has(keyHint.toLowerCase())) return "[REDACTED]";
  if (typeof v === "string") return redactString(v);
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.map((x) => redactValue(x));
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = redactValue(val, k);
    }
    return out;
  }
  return v;
}

export function redact(ctx: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!ctx) return {};
  return redactValue(ctx) as Record<string, unknown>;
}

type Level = "info" | "warn" | "error";

function emit(level: Level, message: string, ctx?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    env: ENV,
    message,
    ...redact(ctx),
  };

  if (IS_DEV) {
    const tag = level === "error" ? "ERR" : level === "warn" ? "WRN" : "INF";
    const { ts: _ts, level: _lv, env: _env, message: _msg, ...rest } = entry;
    void _ts; void _lv; void _env; void _msg;
    const restStr = Object.keys(rest).length ? " " + JSON.stringify(rest) : "";
     
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    fn(`[${tag}] ${message}${restStr}`);
    return;
  }

  const line = JSON.stringify(entry);
   
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(line);
}

export function logEvent(name: string, data?: Record<string, unknown>) {
  emit("info", name, data);
}

export function logError(err: unknown, ctx?: Record<string, unknown>) {
  const base: Record<string, unknown> = { ...(ctx || {}) };
  if (err instanceof Error) {
    base.error = {
      name: err.name,
      message: redactString(err.message),
      stack: err.stack ? redactString(err.stack) : undefined,
    };
  } else {
    try {
      base.error = { message: redactString(String(err)) };
    } catch {
      base.error = { message: "unserializable_error" };
    }
  }
  emit("error", "error", base);
}

/**
 * Runs `fn` with a freshly generated request id. Exposes the id for correlation.
 */
export async function withRequestId<T>(fn: (rid: string) => Promise<T>): Promise<T> {
  const rid = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return fn(rid);
}
