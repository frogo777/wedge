/**
 * Session time tracker — para Sprint 2 S2.2 "Te tomó X minutos".
 *
 * Cuando el user abre wedge (cualquier ruta), marca un timestamp en
 * sessionStorage. Cuando completa una declaración, calculamos el diff.
 *
 * Limitaciones:
 *   - Solo cuenta tiempo activo en la app, NO si dejó la pestaña abierta 3 días
 *     (sessionStorage se pierde al cerrar el tab — eso es lo que queremos).
 *   - Si el user navega entre rutas, el mismo timestamp persiste.
 *   - Si el user pierde el tab y vuelve, sessionStorage se borra → nuevo timer.
 *
 * Es una APROXIMACIÓN del tiempo activo. Bueno para "Te tomó 12 minutos"
 * sin requerir analytics dedicado de active-time-tracking (que sería overkill).
 */

const KEY = "wedge:session_start:v1";

export function markSessionStart(): void {
  if (typeof window === "undefined") return;
  try {
    if (!sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY, String(Date.now()));
    }
  } catch { /* private mode */ }
}

export function getSessionMinutes(): number {
  if (typeof window === "undefined") return 0;
  try {
    const start = sessionStorage.getItem(KEY);
    if (!start) return 0;
    const startMs = parseInt(start, 10);
    if (!Number.isFinite(startMs)) return 0;
    const diffMs = Date.now() - startMs;
    const minutes = Math.round(diffMs / 60000);
    return Math.max(1, minutes); // Mínimo 1 (nunca "te tomó 0 minutos")
  } catch {
    return 0;
  }
}

export function resetSessionStart(): void {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem(KEY); } catch { /* noop */ }
}
