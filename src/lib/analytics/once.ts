/**
 * Helper para disparar un evento "primera vez" en la vida del usuario.
 *
 * Usa localStorage con namespace `wedge:once:<key>` — el evento se
 * dispara una sola vez por (key + device). PostHog dedupe adicional
 * por user_id en su backend.
 *
 * Limitación conocida: si el user limpia localStorage o usa otro
 * device, el evento se re-dispara. PostHog hace dedupe del lado
 * server cuando hay user_id identificado, así que el doble-counting
 * es mitigado en agregado.
 *
 * Para tracking 100% confiable de "primera vez de la vida" hay que
 * persistir en `profiles.first_*_at` server-side (deferred a Sprint 2).
 */

"use client";

const PREFIX = "wedge:once:v1:";

export function fireOnce(key: string, fn: () => void): void {
  if (typeof window === "undefined") return;
  const storageKey = PREFIX + key;
  try {
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, new Date().toISOString());
  } catch {
    // Storage blocked (private window, full disk) — disparar igual,
    // mejor doble-conteo que silencio.
  }
  try { fn(); } catch { /* swallow — analytics never throws */ }
}

export function hasFired(key: string): boolean {
  if (typeof window === "undefined") return false;
  try { return Boolean(localStorage.getItem(PREFIX + key)); }
  catch { return false; }
}

/** Útil para tests — reset un marker específico. */
export function resetOnce(key: string): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(PREFIX + key); }
  catch { /* noop */ }
}
