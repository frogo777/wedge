/**
 * Snapshot REDACTADO del Mes Fiscal en la cuenta del usuario (Fase 5E).
 *
 *   GET    /api/mes/snapshot → { snapshot: StoredFiscalMonthSnapshot | null }
 *   POST   /api/mes/snapshot   body { month: FiscalMonth, source?, decisions?, luk? } → { ok, id }
 *   DELETE /api/mes/snapshot   body { id: string } → { ok }
 *
 * Auth (getUser) + CSRF (requireSameOrigin) en writes + RLS owner-only en DB. El servidor
 * NUNCA confía en el cliente: re-sanitiza y `assertNoSensitiveFields` antes de insertar.
 * No se guardan XML/RFC/UUID/CIEC/e.firma/datos SAT.
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withHandler } from "@/lib/obs/with-handler";
import { logEvent } from "@/lib/obs/logger";
import { requireSameOrigin } from "@/lib/obs/csrf";
import { sanitizeError } from "@/lib/obs/sanitize-error";
import type { FiscalMonth } from "@/lib/mes/types";
import {
  sanitizeFiscalMonthForPersistence,
  assertNoSensitiveFields,
  saveFiscalMonthSnapshot,
  loadLatestFiscalMonthSnapshot,
  deleteFiscalMonthSnapshot,
  type SnapshotSource,
  type DecisionsSummarySnapshot,
  type LukSignalSummarySnapshot,
} from "@/lib/mes/persistence";

export const runtime = "nodejs";

function bad(reason: string, status = 400, extra: Record<string, unknown> = {}) {
  return Response.json({ error: reason, ...extra }, { status });
}

const VALID_SOURCES: SnapshotSource[] = ["diagnostic", "xml_preview", "demo"];

/** Validación ligera: el body trae un FiscalMonth plausible (no confiamos en el cliente). */
function isFiscalMonthLike(v: unknown): v is FiscalMonth {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return (
    typeof m.year === "number" &&
    typeof m.month === "number" &&
    typeof m.monthLabel === "string" &&
    typeof m.regime === "string" &&
    typeof m.status === "string" &&
    Array.isArray(m.pendingActions) &&
    Array.isArray(m.risks)
  );
}

async function handleGET(): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return bad("unauthorized", 401);

  const snapshot = await loadLatestFiscalMonthSnapshot(supabase, user.id);
  return Response.json({ snapshot });
}

async function handlePOST(req: Request): Promise<Response> {
  const csrfDenied = requireSameOrigin(req);
  if (csrfDenied) return csrfDenied;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return bad("unauthorized", 401);

  let body: {
    month?: unknown;
    source?: unknown;
    decisions?: DecisionsSummarySnapshot;
    luk?: LukSignalSummarySnapshot;
  };
  try { body = (await (req as NextRequest).json()) as typeof body; }
  catch { return bad("invalid_json"); }

  if (!isFiscalMonthLike(body.month)) {
    return bad("invalid_payload", 400, { message: "Falta un Mes Fiscal válido." });
  }
  const source: SnapshotSource = VALID_SOURCES.includes(body.source as SnapshotSource)
    ? (body.source as SnapshotSource)
    : "xml_preview";

  let input;
  try {
    input = sanitizeFiscalMonthForPersistence(body.month, {
      source,
      decisions: body.decisions,
      luk: body.luk,
    });
    // Validamos AQUÍ (dentro del try) para que un dato sensible incrustado en texto whitelisted
    // (RFC/UUID/<cfdi/email/tel) devuelva 422 determinista — no un 500 desde save(). El dato NO
    // se persiste en ningún caso (save() también re-asserta como defensa).
    assertNoSensitiveFields(input);
  } catch {
    // Mensaje FIJO (no derivado del error) para que el cliente reciba un copy estable y prod no lo
    // colapse a internal_error. El detalle técnico no se expone.
    return bad("unsafe_payload", 422, {
      message: "El resumen contenía datos no permitidos y no se guardó.",
    });
  }

  const result = await saveFiscalMonthSnapshot(supabase, user.id, input);
  if (!result.ok) return bad("storage_failed", 503, { message: sanitizeError(result.error) });

  logEvent("mes_snapshot_saved", { userId: user.id, source, year: input.year, month: input.month });
  return Response.json({ ok: true, id: result.id });
}

async function handleDELETE(req: Request): Promise<Response> {
  const csrfDenied = requireSameOrigin(req);
  if (csrfDenied) return csrfDenied;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return bad("unauthorized", 401);

  let body: { id?: unknown };
  try { body = (await (req as NextRequest).json()) as { id?: unknown }; }
  catch { return bad("invalid_json"); }

  if (typeof body.id !== "string" || !body.id) {
    return bad("invalid_payload", 400, { message: "Falta el id del snapshot a borrar." });
  }

  const result = await deleteFiscalMonthSnapshot(supabase, user.id, body.id);
  if (!result.ok) return bad("storage_failed", 503, { message: sanitizeError(result.error) });

  logEvent("mes_snapshot_deleted", { userId: user.id });
  return Response.json({ ok: true });
}

export const GET = withHandler(handleGET, { route: "/api/mes/snapshot" });
export const POST = withHandler(handlePOST, { route: "/api/mes/snapshot" });
export const DELETE = withHandler(handleDELETE, { route: "/api/mes/snapshot" });
