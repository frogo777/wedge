/**
 * CFDI Engine — month grouping (Fase 5A).
 *
 * Agrupa CFDIs por periodo "YYYY-MM" usando `monthKey` (que ya considera la fechaPago
 * del complemento para tipo P). Puro y determinista.
 */

import type { NormalizedCfdi } from "./types";

/** { "2026-06": [cfdi, ...], "2026-05": [...] } */
export function groupCfdisByMonth(cfdis: NormalizedCfdi[]): Record<string, NormalizedCfdi[]> {
  const out: Record<string, NormalizedCfdi[]> = {};
  for (const c of cfdis) {
    const key = c.monthKey || "sin-periodo";
    (out[key] ??= []).push(c);
  }
  return out;
}

/** CFDIs de un periodo dado. */
export function cfdisForPeriod(cfdis: NormalizedCfdi[], period: string): NormalizedCfdi[] {
  return cfdis.filter((c) => c.monthKey === period);
}

/** Periodos presentes, ordenados descendente (más reciente primero). */
export function periodsPresent(cfdis: NormalizedCfdi[]): string[] {
  return Array.from(new Set(cfdis.map((c) => c.monthKey).filter(Boolean))).sort().reverse();
}
