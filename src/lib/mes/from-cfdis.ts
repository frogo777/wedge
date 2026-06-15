/**
 * fiscalMonthFromCfdis — convierte CFDIs normalizados (Fase 5A) en un Mes Fiscal.
 *
 * Honesto: las cifras salen de los motores CANÓNICOS de `@/lib/tax`
 * (buildMonthlyDeclaration / buildHonorariosDeclaration), que ya excluyen cancelados y
 * REP "P", aplican cash-basis y reglas de IVA acreditable. NO se recalcula a mano.
 *
 * Lenguaje honesto: "estimado informativo", "requiere revisión", "pendiente de validar en
 * SAT". NUNCA "declaración lista" / "SAT confirmado" / "presentado". El ingreso detectado es
 * lo cobrado según los CFDIs; lo confirmado por el usuario empieza en 0 (aún no validado).
 *
 * Función pura y SSR-safe: recibe `period`/`now` por parámetro (no llama Date.now internamente).
 */

import { buildMonthlyDeclaration, type Transaction } from "@/lib/tax/resico";
import { buildHonorariosDeclaration } from "@/lib/tax/honorarios";
import type { FiscalMonth, PendingAction, Risk, Regime, MesEstado } from "./types";
import type { NormalizedCfdi } from "@/lib/cfdi/types";
import { cfdisForPeriod } from "@/lib/cfdi/month";
import { cfdisToTransactions } from "@/lib/cfdi/taxes";
import { pendingActionsFromCfdis, risksFromCfdis } from "@/lib/cfdi/pending-actions";

export interface FiscalMonthFromCfdisContext {
  /** Periodo "YYYY-MM". Si se omite, se toma el monthKey más común de los CFDIs. */
  period?: string;
  regime?: Regime;
  regimeLabel?: string;
  monthLabel?: string;
  userId?: string;
  /** Fecha de referencia para días a la fecha límite (urgencia). Opcional (puro por defecto). */
  now?: Date;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function monthLabelFromPeriod(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return period;
  const idx = parseInt(m[2], 10) - 1;
  return `${MESES[idx] ?? period} ${m[1]}`;
}

/** Día 17 del mes SIGUIENTE al periodo → ISO. */
function deadlineIsoFromPeriod(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return "";
  let year = parseInt(m[1], 10);
  let month = parseInt(m[2], 10) + 1;
  if (month > 12) { month = 1; year += 1; }
  return new Date(Date.UTC(year, month - 1, 17)).toISOString();
}

function daysBetween(now: Date | undefined, deadlineIso: string): number | null {
  if (!now || !deadlineIso) return null;
  const dl = new Date(deadlineIso).getTime();
  const diff = dl - now.getTime();
  return Math.floor(diff / 86_400_000);
}

/** Periodo más frecuente entre los CFDIs (fallback cuando no se pasa period). */
function dominantPeriod(cfdis: NormalizedCfdi[]): string {
  const counts: Record<string, number> = {};
  for (const c of cfdis) {
    if (!c.monthKey) continue;
    counts[c.monthKey] = (counts[c.monthKey] ?? 0) + 1;
  }
  let best = "";
  let max = -1;
  for (const [k, v] of Object.entries(counts)) {
    if (v > max) { max = v; best = k; }
  }
  return best;
}

export function fiscalMonthFromCfdis(
  cfdis: NormalizedCfdi[],
  ctx: FiscalMonthFromCfdisContext = {},
): FiscalMonth {
  const period = ctx.period || dominantPeriod(cfdis) || "";
  const regime: Regime = ctx.regime === "honorarios" ? "honorarios" : "resico_pf";
  const regimeLabel = ctx.regimeLabel || (regime === "honorarios" ? "Honorarios" : "RESICO PF");
  const monthLabel = ctx.monthLabel || (period ? monthLabelFromPeriod(period) : "Mes fiscal");

  const periodCfdis = period ? cfdisForPeriod(cfdis, period) : cfdis;

  const [yStr, mStr] = (period || "0000-00").split("-");
  const year = parseInt(yStr, 10) || 0;
  const month = parseInt(mStr, 10) || 0;

  const deadline = deadlineIsoFromPeriod(period);
  const daysToDeadline = daysBetween(ctx.now, deadline);

  // CFDIs → Transaction[] → motor canónico (excluye cancelados/REP, cash-basis).
  const txs: Transaction[] = cfdisToTransactions(periodCfdis);

  let ingresosCobrados = 0;
  let isrEstimate = 0;
  let ivaEstimate = 0;
  let retentions = 0;
  if (period) {
    if (regime === "honorarios") {
      const d = buildHonorariosDeclaration(txs, period);
      ingresosCobrados = d.ingresosCobrados;
      isrEstimate = d.isr.aPagar;
      ivaEstimate = d.iva.aPagar;
      retentions = d.isrRetenido + d.ivaRetenido;
    } else {
      const d = buildMonthlyDeclaration(txs, period);
      ingresosCobrados = d.ingresosCobrados;
      isrEstimate = d.isr.aPagar;
      ivaEstimate = d.iva.aPagar;
      retentions = d.isrRetenido + d.ivaRetenido;
    }
  }

  const pendingActions: PendingAction[] = pendingActionsFromCfdis(periodCfdis, { daysToDeadline });
  const risks: Risk[] = risksFromCfdis(periodCfdis);

  const nextBestAction =
    pendingActions.find((p) => p.status === "current") ?? pendingActions[0] ?? null;

  const cfdisIssued = periodCfdis.filter(
    (c) => c.direction === "emitido" && c.status !== "cancelado",
  ).length;
  const cfdisReceived = periodCfdis.filter(
    (c) => c.direction === "recibido" && c.status !== "cancelado",
  ).length;

  // Progreso honesto: hay datos importados pero NADA confirmado por el usuario aún;
  // más pendientes bloqueantes = menos listo.
  const blocking = pendingActions.filter((p) => p.type !== "validar_en_sat").length;
  const progress =
    periodCfdis.length === 0 ? 0 : Math.max(15, Math.min(60, 60 - blocking * 7));

  // Estado del ciclo del mes.
  let status: MesEstado;
  if (periodCfdis.length === 0) status = "sin_datos";
  else if (risks.length > 0) status = "en_revision";
  else if (blocking > 0) status = "datos_importados";
  else status = "calculo_estimado";

  const createdAt = ctx.now ? ctx.now.toISOString() : deadline || "";

  return {
    id: `mes-${period || "cfdi"}-cfdi`,
    userId: ctx.userId || "self",
    year,
    month,
    monthLabel,
    regime,
    regimeLabel,
    status,
    progress,
    deadline,
    incomeDetected: ingresosCobrados, // cobrado según CFDIs (excluye PPD no cobrado y cancelados)
    incomeConfirmed: 0,               // nada validado por el usuario aún
    cfdisIssued,
    cfdisReceived,
    isrEstimate,
    ivaEstimate,
    retentions,
    pendingActions,
    risks,
    nextBestAction,
    satGuideStatus: "no_aplica",
    evidenceStatus: periodCfdis.length > 0 ? "parcial" : "vacio",
    historyPreview: [],
    createdAt,
    updatedAt: createdAt,
  };
}
