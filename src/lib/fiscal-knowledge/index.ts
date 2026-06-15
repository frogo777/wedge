/**
 * Fiscal Knowledge v0 — API pública (Fase 6B).
 */

import type { LukSignalType } from "@/lib/luk/types";
import type { FiscalConcept } from "./types";
import { FISCAL_CONCEPTS, CONCEPT_BY_SIGNAL_TYPE } from "./concepts";

export type { FiscalConcept, SourceLevel } from "./types";
export { FISCAL_CONCEPTS, CONCEPT_BY_SIGNAL_TYPE } from "./concepts";

/** Concepto por id. null si no existe. */
export function getConcept(id: string): FiscalConcept | null {
  return FISCAL_CONCEPTS[id] ?? null;
}

/** Concepto asociado a un tipo de señal luk. null si no hay (→ el caller usa fallback seguro). */
export function getConceptForSignalType(type: LukSignalType): FiscalConcept | null {
  return CONCEPT_BY_SIGNAL_TYPE[type] ?? null;
}

/** Todos los conceptos (para auditoría/listados). */
export function allConcepts(): FiscalConcept[] {
  return Object.values(FISCAL_CONCEPTS);
}
