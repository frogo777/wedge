/**
 * Decisión de modo de entrada a /app/mes (R7.5).
 *
 * CLAVE: el snapshot guardado en la cuenta (DB) GANA al draft de diagnóstico local
 * (localStorage). Antes el draft viejo TAPABA el Mes Fiscal guardado → el usuario
 * autenticado caía en diagnóstico y sentía que perdió su avance.
 *
 * Prioridad:
 *   1) "xml-preview" — preview de XML/ZIP activo en ESTA sesión (sessionStorage): acción
 *      intencional reciente del usuario → se muestra para revisar/guardar.
 *   2) "guardado"    — snapshot redactado guardado en la cuenta (DB).
 *   3) "diagnostico"/"expirado" — draft de diagnóstico local, SOLO si no hay snapshot.
 *   4) "demo"        — nada local ni guardado → datos de ejemplo (estado inicial).
 *
 * Función PURA (sin acceso a window/DB) para poder testearla. El draft NUNCA reemplaza
 * el snapshot guardado de forma automática; usarlo es una acción explícita (con confirmación).
 */
export type MesEntryMode = "xml-preview" | "guardado" | "diagnostico" | "expirado" | "demo";

export interface MesEntryInputs {
  /** Hay un preview de XML/ZIP cargado en esta sesión (sessionStorage). */
  hasPreview: boolean;
  /** El usuario tiene un snapshot redactado guardado en su cuenta (DB). */
  hasSnapshot: boolean;
  /** Hay un draft de diagnóstico en localStorage. */
  hasDraft: boolean;
  /** El draft está fresco (<= 30 días). Solo aplica si hasDraft. */
  draftFresh: boolean;
}

export function chooseMesEntryMode(i: MesEntryInputs): MesEntryMode {
  if (i.hasPreview) return "xml-preview";
  if (i.hasSnapshot) return "guardado";
  if (i.hasDraft) return i.draftFresh ? "diagnostico" : "expirado";
  return "demo";
}

/**
 * ¿Hay un draft local "sin aplicar" mientras se muestra el snapshot guardado? Si es así, la UI
 * ofrece usarlo EXPLÍCITAMENTE (con confirmación), nunca en automático. Solo tiene sentido cuando
 * el modo resuelto es "guardado" y existe un draft.
 */
export function hasUnappliedDraft(i: MesEntryInputs): boolean {
  return i.hasSnapshot && i.hasDraft && !i.hasPreview;
}
