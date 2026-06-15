/**
 * Persistencia segura del Mes Fiscal (Fase 5E).
 *
 * Guarda SOLO un snapshot REDACTADO (agregados + pendientes/risks de texto genérico). NUNCA
 * XML/ZIP crudo, RFC/UUID completos, CIEC, e.firma, datos SAT, credenciales ni CFDIs crudos.
 *
 * El SERVIDOR es la autoridad: re-sanitiza con whitelist estricta de campos
 * (`sanitizeFiscalMonthForPersistence`, que proyecta pending_actions/risks a sus campos
 * conocidos) y valida con `assertNoSensitiveFields` antes de insertar. El cliente nunca decide
 * qué columnas se persisten. RLS owner-only respalda en DB.
 *
 * Las funciones de sanitización son PURAS (testeables). Las de DB reciben un `SupabaseClient`
 * inyectado (creado en la API route bajo la sesión del usuario → RLS).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FiscalMonth, PendingAction, Risk, Regime, MesEstado } from "./types";

export const SNAPSHOT_TABLE = "fiscal_month_snapshots";
export const PRIVACY_LEVEL = "redacted_snapshot";

export type SnapshotSource = "diagnostic" | "xml_preview" | "demo";

export interface DecisionsSummarySnapshot {
  confirmed: number;
  excluded: number;
  review: number;
}
export interface LukSignalSummarySnapshot {
  total: number;
  warning: number;
  review: number;
  info: number;
}

/** Columnas que se INSERTAN (sin id/user_id/timestamps, que pone el servidor/DB). */
export interface FiscalMonthSnapshotInput {
  year: number;
  month: number;
  month_label: string;
  regime: string;
  status: string;
  source: SnapshotSource;
  progress: number;
  deadline_date: string | null;
  income_detected: number;
  income_confirmed: number;
  isr_estimate: number;
  iva_estimate: number;
  retentions: number;
  cfdis_issued_count: number;
  cfdis_received_count: number;
  pending_actions: PendingAction[];
  risks: Risk[];
  decisions_summary: DecisionsSummarySnapshot | Record<string, never>;
  luk_signal_summary: LukSignalSummarySnapshot | Record<string, never>;
  privacy_level: string;
}

/** Fila leída de DB (incluye id/timestamps). */
export interface StoredFiscalMonthSnapshot extends FiscalMonthSnapshotInput {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface SnapshotExtras {
  source: SnapshotSource;
  decisions?: DecisionsSummarySnapshot;
  luk?: LukSignalSummarySnapshot;
}

/** "2026-07-17T00:00:00.000Z" → "2026-07-17"; "" / inválido → null. */
function dateOnly(iso: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso || "");
  return m ? m[1] : null;
}

/**
 * Proyección explícita a los campos CONOCIDos de PendingAction/Risk (sub-whitelist). Si un motor
 * futuro añade un campo nuevo (p. ej. un RFC relacionado), NO se cuela al snapshot por accidente.
 */
function projectPendingAction(p: PendingAction): PendingAction {
  return {
    id: p.id, type: p.type, title: p.title, description: p.description,
    urgency: p.urgency, impact: p.impact, risk: p.risk, estimatedTime: p.estimatedTime,
    source: p.source, status: p.status, actionLabel: p.actionLabel,
  };
}
function projectRisk(r: Risk): Risk {
  return {
    id: r.id, severity: r.severity, title: r.title,
    explanation: r.explanation, source: r.source, recommendedAction: r.recommendedAction,
  };
}

/**
 * Construye el snapshot REDACTADO desde un FiscalMonth (whitelist de campos).
 * pending_actions/risks son texto genérico del motor (sin PII); `assertNoSensitiveFields`
 * los valida igual como red de seguridad.
 */
export function sanitizeFiscalMonthForPersistence(
  month: FiscalMonth,
  extras: SnapshotExtras,
): FiscalMonthSnapshotInput {
  return {
    year: month.year,
    month: month.month,
    month_label: month.monthLabel,
    regime: month.regime,
    status: month.status,
    source: extras.source,
    progress: month.progress,
    deadline_date: dateOnly(month.deadline),
    income_detected: month.incomeDetected,
    income_confirmed: month.incomeConfirmed,
    isr_estimate: month.isrEstimate,
    iva_estimate: month.ivaEstimate,
    retentions: month.retentions,
    cfdis_issued_count: month.cfdisIssued,
    cfdis_received_count: month.cfdisReceived,
    pending_actions: month.pendingActions.map(projectPendingAction),
    risks: month.risks.map(projectRisk),
    decisions_summary: extras.decisions ?? {},
    luk_signal_summary: extras.luk ?? {},
    privacy_level: PRIVACY_LEVEL,
  };
}

/** Claves que NUNCA deben aparecer en un snapshot. */
const FORBIDDEN_KEYS = new Set([
  "raw_xml", "rawxml", "xml", "zip", "rfc", "uuid", "ciec", "efirma", "e_firma",
  "fiel", "curp", "sat_password", "satpassword", "raw_cfdis", "rawcfdis",
  "emisor", "receptor", "issuer_rfc", "receiver_rfc", "emisor_rfc", "receptor_rfc",
  "nombre", "name", "razon_social", "razonsocial", "email", "correo",
  "telefono", "domicilio", "direccion", "address", "tax_id", "taxid",
]);
// Flag /i: detecta RFC en minúsculas (xaxx010101000) además de MAYÚSCULAS.
const RFC_RE = /\b[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b/i;
// UUID con guiones y también el formato compacto de 32 hex (algunos exports).
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const UUID_COMPACT_RE = /\b[0-9a-f]{32}\b/i;
const CFDI_RE = /<\s*cfdi/i;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_RE = /\b\d{10}\b/; // teléfono MX de 10 dígitos contiguos

function collectKeys(value: unknown, out: Set<string>): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const v of value) collectKeys(v, out);
    return;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out.add(k.toLowerCase());
    collectKeys(v, out);
  }
}

/** Recolecta solo los VALORES string (no números) para escanear patrones de PII sin falsos
 * positivos sobre montos numéricos. */
function collectStringValues(value: unknown, out: string[]): void {
  if (typeof value === "string") { out.push(value); return; }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { for (const v of value) collectStringValues(v, out); return; }
  for (const v of Object.values(value as Record<string, unknown>)) collectStringValues(v, out);
}

/**
 * Lanza si el payload contiene una clave prohibida o, en algún VALOR de texto, un patrón de dato
 * sensible (RFC, UUID, `<cfdi`, email, teléfono). Es la red de seguridad server-side antes de
 * insertar. NOTA: pending_actions/risks son texto generado por el MOTOR (no entrada libre del
 * usuario); la garantía es "sin identificadores crudos ni claves sensibles", redacción
 * ESTRUCTURAL — los montos agregados sí se retienen a propósito (son el objeto del snapshot).
 */
export function assertNoSensitiveFields(payload: unknown): void {
  const keys = new Set<string>();
  collectKeys(payload, keys);
  for (const k of keys) {
    if (FORBIDDEN_KEYS.has(k)) throw new Error(`snapshot rechazado: campo prohibido "${k}"`);
  }
  const strings: string[] = [];
  collectStringValues(payload, strings);
  for (const s of strings) {
    if (RFC_RE.test(s)) throw new Error("snapshot rechazado: posible RFC en el contenido");
    if (UUID_RE.test(s) || UUID_COMPACT_RE.test(s)) throw new Error("snapshot rechazado: posible UUID en el contenido");
    if (CFDI_RE.test(s)) throw new Error("snapshot rechazado: XML CFDI en el contenido");
    if (EMAIL_RE.test(s)) throw new Error("snapshot rechazado: posible email en el contenido");
    if (PHONE_RE.test(s)) throw new Error("snapshot rechazado: posible teléfono en el contenido");
  }
}

/** Reconstruye un FiscalMonth desde un snapshot guardado (para la vista "guardado"). */
export function fiscalMonthFromSnapshot(snap: StoredFiscalMonthSnapshot): FiscalMonth {
  const regime: Regime = snap.regime === "honorarios" ? "honorarios" : "resico_pf";
  const pendingActions = Array.isArray(snap.pending_actions) ? snap.pending_actions : [];
  const risks = Array.isArray(snap.risks) ? snap.risks : [];
  const nextBestAction = pendingActions.find((p) => p.status === "current") ?? pendingActions[0] ?? null;
  return {
    id: snap.id,
    userId: snap.user_id,
    year: snap.year,
    month: snap.month,
    monthLabel: snap.month_label || "",
    regime,
    regimeLabel: regime === "honorarios" ? "Honorarios" : "RESICO PF",
    status: (snap.status as MesEstado) || "datos_importados",
    progress: snap.progress ?? 0,
    deadline: snap.deadline_date ? `${snap.deadline_date}T00:00:00.000Z` : "",
    incomeDetected: snap.income_detected ?? 0,
    incomeConfirmed: snap.income_confirmed ?? 0,
    cfdisIssued: snap.cfdis_issued_count ?? 0,
    cfdisReceived: snap.cfdis_received_count ?? 0,
    isrEstimate: snap.isr_estimate ?? 0,
    ivaEstimate: snap.iva_estimate ?? 0,
    retentions: snap.retentions ?? 0,
    pendingActions,
    risks,
    nextBestAction,
    satGuideStatus: "no_aplica",
    evidenceStatus: "vacio",
    historyPreview: [],
    createdAt: snap.created_at,
    updatedAt: snap.updated_at,
  };
}

/* ─── Capa DB (recibe el SupabaseClient autenticado de la API route) ───────── */

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

/** Inserta/actualiza (UPSERT por user_id+year+month+source) el snapshot. Valida antes. */
export async function saveFiscalMonthSnapshot(
  supabase: SupabaseClient,
  userId: string,
  input: FiscalMonthSnapshotInput,
): Promise<SaveResult> {
  assertNoSensitiveFields(input); // red de seguridad server-side
  const row = { ...input, user_id: userId, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from(SNAPSHOT_TABLE)
    .upsert(row, { onConflict: "user_id,year,month,source" })
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: (data as { id?: string } | null)?.id ?? "" };
}

/** Carga el snapshot más reciente del usuario (o null). */
export async function loadLatestFiscalMonthSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<StoredFiscalMonthSnapshot | null> {
  const { data, error } = await supabase
    .from(SNAPSHOT_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as StoredFiscalMonthSnapshot;
}

export type DeleteResult = { ok: true } | { ok: false; error: string };

/** Borra un snapshot por id (acotado a owner por el .eq + RLS). */
export async function deleteFiscalMonthSnapshot(
  supabase: SupabaseClient,
  userId: string,
  snapshotId: string,
): Promise<DeleteResult> {
  const { error } = await supabase
    .from(SNAPSHOT_TABLE)
    .delete()
    .eq("id", snapshotId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
