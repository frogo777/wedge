/**
 * Fiscal Knowledge v0 (Fase 6B) — base de conocimiento fiscal DETERMINÍSTICA y controlada.
 *
 * Conceptos curados a mano para que las señales de luk se expliquen mejor. SIN LLM, sin red.
 * REGLA DURA: no inventar fuentes oficiales ni citar al SAT como fuente (no se cargó/validó una
 * fuente oficial en esta fase). Usar `general` / `internal_rule` / `requires_review`.
 */

import type { LukSignalType } from "@/lib/luk/types";

/**
 * Nivel de fuente del concepto:
 * - `general`: conocimiento fiscal general, no específico de una fuente oficial cargada.
 * - `internal_rule`: regla del propio producto (p. ej. decisiones locales del usuario).
 * - `requires_review`: depende de la situación del usuario; debe revisarse caso por caso.
 * - `future_sat_source`: reservado para cuando se cargue/valide una fuente oficial (NO se usa aún).
 */
export type SourceLevel = "general" | "internal_rule" | "requires_review" | "future_sat_source";

export interface FiscalConcept {
  id: string;
  title: string;
  /** Definición corta y neutral ("qué es"). */
  shortDefinition: string;
  /** Explicación informativa segura ("por qué importa / cómo funciona"), sin certeza absoluta. */
  userSafeExplanation: string;
  /** Preguntas concretas que el usuario puede revisar. */
  reviewQuestions: string[];
  /** Tipos de señal luk a los que aplica este concepto. */
  relatedSignalTypes: LukSignalType[];
  /** Límite/advertencia honesta (p. ej. "si no estás seguro, consulta a un contador"). */
  caution: string;
  sourceLevel: SourceLevel;
}
