/**
 * sanitizeError — devuelve un mensaje de error seguro para mandar al cliente.
 *
 * En desarrollo retorna el mensaje completo (útil para debug). En producción
 * retorna un fallback genérico para evitar leak de schema/DB internals — un
 * atacante podía mandar payloads inválidos a /api/profile/* y mapear nuestra
 * estructura de tablas via errores de Supabase ("duplicate key", "column does
 * not exist", "violates unique constraint").
 *
 * Uso:
 *   if (error) return bad("storage_failed", 503, { message: sanitizeError(error) });
 *
 * El mensaje crudo SIEMPRE se loggea via logError(); este wrapper solo afecta
 * la respuesta HTTP.
 */

const SAFE_MESSAGES = new Set([
  // Mensajes que SÍ queremos mostrar al cliente (validaciones de usuario).
  "unauthorized",
  "forbidden",
  "not_found",
  "rate_limited",
  "invalid_json",
  "invalid_payload",
  "service_unavailable",
  "service_role_missing",
  "syntage_not_configured",
  "stripe_not_configured",
]);

export function sanitizeError(err: unknown, fallback = "internal_error"): string {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    return fallback;
  }
  // Prod: solo retornamos el mensaje si está en la allowlist de strings
  // seguras (errores de validación, no de infra).
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (SAFE_MESSAGES.has(msg)) return msg;
  return fallback;
}
