/**
 * CFDI preview store (Fase 5C) — comparte el preview entre /app/mes y /app/cfdis.
 *
 * DECISIÓN: `sessionStorage` (por-pestaña, se borra al cerrar la pestaña) → mínima exposición
 * de datos fiscales en equipos compartidos, y sobrevive la navegación /app/mes → /app/cfdis en
 * la misma sesión. TTL de respaldo: 24 h. SSR-safe (guards typeof window) y fail-soft (try/catch).
 *
 * PRIVACIDAD: se guarda SOLO `RedactedCfdi[]` (sin UUID crudo, sin RFC completo, sin XML) + un
 * resumen numérico del Mes Fiscal. NUNCA XML crudo ni identificadores fiscales en claro.
 */

import { redactCfdiForClient, type RedactedCfdi } from "./upload";
import type { NormalizedCfdi, CfdiStatus } from "./types";
import type { InboxDecision } from "./inbox";

const KEY = "wedge:cfdi-preview";
export const PREVIEW_VERSION = 1;
export const PREVIEW_FRESH_HOURS = 24;

export interface CfdiPreviewSummary {
  incomeDetected: number;
  isrEstimate: number;
  ivaEstimate: number;
  retentions: number;
}

export interface StoredCfdiPreview {
  version: number;
  /** ISO de guardado. */
  savedAt: string;
  /** "YYYY-MM" del mes previsualizado. */
  period: string;
  monthLabel: string;
  regimeLabel: string;
  source: "upload" | "demo";
  /** CFDIs REDACTADOS (sin UUID/RFC/XML). */
  cfdis: RedactedCfdi[];
  /** Snapshot del Mes Fiscal (mismas cifras que /app/mes, para no divergir). */
  summary: CfdiPreviewSummary;
}

/** Redacta una lista de CFDIs para almacenamiento (sin UUID/RFC/XML). */
export function redactPreviewForStorage(cfdis: NormalizedCfdi[]): RedactedCfdi[] {
  return cfdis.map(redactCfdiForClient);
}

export function saveCfdiPreview(preview: StoredCfdiPreview): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(preview));
  } catch {
    // sessionStorage lleno/deshabilitado: no rompemos el flujo.
  }
}

function isFreshIso(savedAt: string, now: Date): boolean {
  const saved = new Date(savedAt).getTime();
  if (!Number.isFinite(saved)) return false;
  const ageMs = now.getTime() - saved;
  return ageMs >= 0 && ageMs <= PREVIEW_FRESH_HOURS * 60 * 60 * 1000;
}

export function isCfdiPreviewFresh(preview: StoredCfdiPreview, now: Date = new Date()): boolean {
  return isFreshIso(preview.savedAt, now);
}

/** Valida la forma mínima de un CFDI redactado (evita que un blob corrupto crashee el render). */
function isValidRedacted(c: unknown): boolean {
  if (!c || typeof c !== "object") return false;
  const r = c as Record<string, unknown>;
  const t = r.taxes as Record<string, unknown> | undefined;
  return (
    typeof r.id === "string" &&
    typeof r.monthKey === "string" &&
    typeof r.subtotal === "number" &&
    typeof r.total === "number" &&
    Array.isArray(r.warnings) &&
    !!t &&
    typeof t.isrRetenido === "number" &&
    typeof t.ivaRetenido === "number" &&
    typeof t.ivaTrasladado === "number"
  );
}

export function loadCfdiPreview(now: Date = new Date()): StoredCfdiPreview | null {
  if (typeof window === "undefined") return null;
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredCfdiPreview;
    if (parsed?.version !== PREVIEW_VERSION) return null;
    if (typeof parsed.savedAt !== "string" || !Array.isArray(parsed.cfdis)) return null;
    if (!parsed.cfdis.every(isValidRedacted)) return null;
    if (!isCfdiPreviewFresh(parsed, now)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCfdiPreview(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // no-op
  }
}

/* ─── Decisiones temporales del Fiscal Inbox (Fase 5D) ──────────────────────────── */

export type CfdiDecisionAction = "confirm" | "exclude" | "review";

/** Decisión temporal del usuario sobre un CFDI (vive en sessionStorage, NO se persiste en la nube). */
export interface CfdiDecision {
  cfdiId: string;
  action: CfdiDecisionAction;
  /** Estado efectivo que implica la decisión. */
  statusOverride: CfdiStatus;
  decidedAt: string;
  source: "fiscal-inbox";
}

const DECISIONS_KEY = "wedge:cfdi-decisions";
export const DECISIONS_VERSION = 1;

interface StoredDecisions {
  version: number;
  savedAt: string;
  decisions: Record<string, CfdiDecision>;
}

const ACTION_OF: Record<InboxDecision, CfdiDecisionAction> = { confirmado: "confirm", excluido: "exclude", revisar: "review" };
const INBOX_OF: Record<CfdiDecisionAction, InboxDecision> = { confirm: "confirmado", exclude: "excluido", review: "revisar" };
const STATUS_OF: Record<CfdiDecisionAction, CfdiStatus> = { confirm: "confirmado", exclude: "excluido", review: "requiereRevision" };

/**
 * Guarda el MAPA completo de decisiones (cfdiId → InboxDecision) como `CfdiDecision[]` en
 * sessionStorage. Si el mapa queda vacío, borra la entrada. NO guarda UUID/RFC/XML.
 */
export function saveCfdiDecisions(decisions: Record<string, InboxDecision>, now: Date = new Date()): void {
  if (typeof window === "undefined") return;
  try {
    const at = now.toISOString();
    const map: Record<string, CfdiDecision> = {};
    for (const [cfdiId, d] of Object.entries(decisions)) {
      const action = ACTION_OF[d];
      map[cfdiId] = { cfdiId, action, statusOverride: STATUS_OF[action], decidedAt: at, source: "fiscal-inbox" };
    }
    if (Object.keys(map).length === 0) {
      window.sessionStorage.removeItem(DECISIONS_KEY);
      return;
    }
    const payload: StoredDecisions = { version: DECISIONS_VERSION, savedAt: at, decisions: map };
    window.sessionStorage.setItem(DECISIONS_KEY, JSON.stringify(payload));
  } catch {
    // no-op (sessionStorage lleno/deshabilitado)
  }
}

/** Carga las decisiones como mapa cfdiId → InboxDecision ({} si no hay / stale / SSR). */
export function loadCfdiDecisions(now: Date = new Date()): Record<string, InboxDecision> {
  if (typeof window === "undefined") return {};
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(DECISIONS_KEY);
  } catch {
    return {};
  }
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as StoredDecisions;
    if (parsed?.version !== DECISIONS_VERSION || !parsed.decisions) return {};
    if (typeof parsed.savedAt !== "string" || !isFreshIso(parsed.savedAt, now)) return {};
    const out: Record<string, InboxDecision> = {};
    for (const [cfdiId, d] of Object.entries(parsed.decisions)) {
      if (d && (d.action === "confirm" || d.action === "exclude" || d.action === "review")) {
        out[cfdiId] = INBOX_OF[d.action];
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function clearCfdiDecisions(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DECISIONS_KEY);
  } catch {
    // no-op
  }
}

export function hasTemporaryDecisions(now: Date = new Date()): boolean {
  return Object.keys(loadCfdiDecisions(now)).length > 0;
}
