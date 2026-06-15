/**
 * Recálculo del Mes Fiscal desde el preview + decisiones temporales (Fase 5D).
 *
 * Reconstruye un `NormalizedCfdi` mínimo (campos NO-PII) desde cada `RedactedCfdi` del preview,
 * aplica las decisiones del Fiscal Inbox y reutiliza `fiscalMonthFromCfdis` (motores canónicos
 * `@/lib/tax`) — sin duplicar el cálculo fiscal. Honesto: una decisión `exclude` cae del cálculo;
 * `confirm` marca confirmado pero NO suma dinero nuevo; nunca implica validación del SAT.
 */

import type { NormalizedCfdi } from "./types";
import type { RedactedCfdi } from "./upload";
import type { StoredCfdiPreview } from "./preview-store";
import type { InboxDecision } from "./inbox";
import type { FiscalMonth, Risk, Regime } from "@/lib/mes/types";
import { applyCfdiDecisions } from "./inbox";
import { fiscalMonthFromCfdis } from "@/lib/mes/from-cfdis";

/** Reconstruye un NormalizedCfdi mínimo (sin UUID/RFC/nombres reales) desde un RedactedCfdi. */
export function redactedToNormalized(r: RedactedCfdi): NormalizedCfdi {
  return {
    id: r.id,
    uuid: null,
    version: "4.0",
    type: r.type,
    direction: r.direction,
    issuedAt: `${r.monthKey}-01T00:00:00`,
    monthKey: r.monthKey,
    issuerName: "",
    issuerRfcMasked: "—",
    receiverName: "",
    receiverRfcMasked: "—",
    subtotal: r.subtotal,
    total: r.total,
    currency: r.currency,
    paymentMethod: r.paymentMethod,
    paymentForm: r.paymentForm,
    cfdiUse: "",
    status: r.status,
    taxes: r.taxes,
    concepts: [],
    source: "xml",
    warnings: r.warnings,
  };
}

function regimeFromLabel(label: string): Regime {
  return /honorarios/i.test(label) ? "honorarios" : "resico_pf";
}

export interface RecomputeContext {
  now?: Date;
}

/**
 * Recalcula el Mes Fiscal aplicando las decisiones temporales del Fiscal Inbox.
 * Si hay decisiones, antepone un risk informativo "Incluye decisiones temporales".
 */
export function fiscalMonthFromCfdiPreviewWithDecisions(
  preview: StoredCfdiPreview,
  decisions: Record<string, InboxDecision>,
  ctx: RecomputeContext = {},
): FiscalMonth {
  const effective = applyCfdiDecisions(preview.cfdis, decisions).map(redactedToNormalized);
  const month = fiscalMonthFromCfdis(effective, {
    period: preview.period,
    regime: regimeFromLabel(preview.regimeLabel),
    regimeLabel: preview.regimeLabel,
    monthLabel: preview.monthLabel,
    now: ctx.now,
  });

  if (Object.keys(decisions).length === 0) return month;

  const note: Risk = {
    id: "inbox-decisiones-temporales",
    severity: "info",
    title: "Incluye decisiones temporales",
    explanation: "Este cálculo refleja tus decisiones locales del Fiscal Inbox en esta sesión. No modifican el SAT ni se guardan permanentemente.",
    source: "calculo",
    recommendedAction: "Seguir revisando en el Fiscal Inbox",
  };
  return { ...month, risks: [note, ...month.risks] };
}
