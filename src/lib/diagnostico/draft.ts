/**
 * DiagnosticDraft — borrador del diagnóstico para el handoff a `/app/mes` (Fase 4D).
 *
 * Se guarda en localStorage (este navegador) para que el diagnóstico público se convierta
 * en el primer Mes Fiscal tras crear cuenta. Es MÍNIMAMENTE sensible: solo el ingreso
 * aproximado AUTO-reportado + las 3 respuestas + el resumen estimado.
 *
 * NUNCA guarda: RFC, CIEC, e.firma, datos SAT, XML, UUIDs reales ni datos personales.
 * No es persistencia en la nube (solo este navegador); expira a los 30 días y se puede borrar.
 */

import type { DiagRegime, TriState, DiagnosticoResult } from "./estimate";

export const DRAFT_KEY = "wedge:diagnostic-draft";
export const DRAFT_VERSION = 1 as const;
export const DRAFT_FRESH_DAYS = 30;

export interface DiagnosticDraft {
  version: typeof DRAFT_VERSION;
  createdAt: string; // ISO
  period: string; // "YYYY-MM"
  monthLabel: string; // "Junio 2026"
  regime: DiagRegime;
  regimeLabel: string;
  /** Ingreso aproximado AUTO-reportado (no proviene de SAT/CFDI). */
  incomeApprox: number;
  hasCfdiExpenses: TriState;
  hasRetentions: TriState;
  estimateSummary: {
    isrEstimado: number | null;
    isrRatePct: number | null;
    ivaTrasladado: number | null;
    readinessPct: number;
    deadlineLabel: string;
    daysToDeadline: number | null;
  };
  pendientes: string[];
  source: "diagnostico-publico";
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** "2026-06" → "Junio 2026". Fallback al período crudo si no parsea. */
export function monthLabelFromPeriod(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return period;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  if (month < 1 || month > 12) return period;
  return `${MESES[month - 1]} ${year}`;
}

export interface DiagnosticDraftInput {
  regime: DiagRegime;
  incomeApprox: number;
  hasCfdiExpenses: TriState;
  hasRetentions: TriState;
  period: string;
}

/** Construye un draft seguro a partir del resultado + respuestas del diagnóstico. */
export function createDiagnosticDraft(
  result: DiagnosticoResult,
  input: DiagnosticDraftInput,
  now: Date = new Date(),
): DiagnosticDraft {
  return {
    version: DRAFT_VERSION,
    createdAt: now.toISOString(),
    period: input.period,
    monthLabel: monthLabelFromPeriod(input.period),
    regime: input.regime,
    regimeLabel: result.regimeLabel,
    incomeApprox: Math.max(0, Math.round(input.incomeApprox || 0)),
    hasCfdiExpenses: input.hasCfdiExpenses,
    hasRetentions: input.hasRetentions,
    estimateSummary: {
      isrEstimado: result.isrEstimado,
      isrRatePct: result.isrRatePct,
      ivaTrasladado: result.ivaTrasladado,
      readinessPct: result.readinessPct,
      deadlineLabel: result.deadlineLabel,
      daysToDeadline: result.daysToDeadline,
    },
    pendientes: result.pendientes,
    source: "diagnostico-publico",
  };
}

export function saveDiagnosticDraft(draft: DiagnosticDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* localStorage lleno / deshabilitado — fail-soft, el flujo sigue */
  }
}

export function loadDiagnosticDraft(): DiagnosticDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DiagnosticDraft>;
    if (!parsed || parsed.version !== DRAFT_VERSION || typeof parsed.createdAt !== "string") return null;
    return parsed as DiagnosticDraft;
  } catch {
    return null;
  }
}

export function clearDiagnosticDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* fail-soft */
  }
}

/** ¿El draft sigue fresco? (≤ 30 días desde createdAt). */
export function isDiagnosticDraftFresh(draft: DiagnosticDraft, now: Date = new Date()): boolean {
  const created = new Date(draft.createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  const ageMs = now.getTime() - created;
  return ageMs >= 0 && ageMs <= DRAFT_FRESH_DAYS * 24 * 60 * 60 * 1000;
}
