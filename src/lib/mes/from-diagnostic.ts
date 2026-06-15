/**
 * fiscalMonthFromDiagnosticDraft — convierte un DiagnosticDraft (diagnóstico público
 * guardado) en el primer Mes Fiscal del usuario (Fase 4D).
 *
 * Honesto: SIN CFDIs reales (cfdis = 0, ingresos confirmados = 0). El ingreso es el
 * aproximado AUTO-reportado en el diagnóstico. Los pendientes derivan de las respuestas
 * (traer CFDIs, confirmar ingresos, revisar IVA, validar retención, confirmar régimen).
 * Wedge prepara; el usuario valida y presenta en SAT.
 */

import type { DiagnosticDraft } from "@/lib/diagnostico/draft";
import type { FiscalMonth, PendingAction, Risk } from "./types";

/** Día 17 del mes SIGUIENTE al período "YYYY-MM" → ISO. */
function deadlineIsoFromPeriod(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return "";
  let year = parseInt(m[1], 10);
  let month = parseInt(m[2], 10) + 1; // mes siguiente
  if (month > 12) { month = 1; year += 1; }
  return new Date(Date.UTC(year, month - 1, 17)).toISOString();
}

export function fiscalMonthFromDiagnosticDraft(draft: DiagnosticDraft): FiscalMonth {
  const [yStr, mStr] = draft.period.split("-");
  const year = parseInt(yStr, 10) || new Date(draft.createdAt).getUTCFullYear();
  const month = parseInt(mStr, 10) || (new Date(draft.createdAt).getUTCMonth() + 1);

  const traerCfdis: PendingAction = {
    id: "diag-cfdis",
    type: "traer_cfdis",
    title: "Trae tus CFDIs para afinar el cálculo",
    description: "Tu Mes Fiscal empezó con tu diagnóstico. Trae tus CFDIs (XML/ZIP o conexión SAT) para precisarlo.",
    urgency: "soon",
    impact: "afina tu ISR e IVA del mes",
    risk: "bajo",
    estimatedTime: "5 min",
    source: "diagnostico",
    status: "current",
    actionLabel: "Completar con XML/ZIP",
  };

  const pendingActions: PendingAction[] = [traerCfdis];

  pendingActions.push({
    id: "diag-ingresos",
    type: "confirmar_ingreso",
    title: "Confirmar tus ingresos cobrados",
    description: "El ingreso del diagnóstico es aproximado; confírmalo con tus CFDIs.",
    urgency: "calm",
    impact: "define tu base de ISR",
    risk: "bajo",
    estimatedTime: "2 min",
    source: "diagnostico",
    status: "todo",
    actionLabel: "Confirmar ingresos",
  });

  if (draft.hasCfdiExpenses !== "no") {
    pendingActions.push({
      id: "diag-iva",
      type: "revisar_iva",
      title: "Revisar IVA acreditable",
      description: draft.hasCfdiExpenses === "unsure"
        ? "Dijiste que no estás seguro de tus gastos con CFDI; revisarlos puede bajar tu IVA."
        : "Tus gastos con CFDI pueden bajar tu IVA a pagar.",
      urgency: "calm",
      impact: "puede bajar tu IVA a pagar",
      risk: "ninguno",
      estimatedTime: "3 min",
      source: "diagnostico",
      status: "todo",
      actionLabel: "Revisar IVA",
    });
  }

  if (draft.hasRetentions !== "no") {
    pendingActions.push({
      id: "diag-retencion",
      type: "validar_retencion",
      title: "Validar tus retenciones",
      description: draft.hasRetentions === "unsure"
        ? "Dijiste que no estás seguro de tus retenciones; valídalas — cuentan a tu favor."
        : "Tus retenciones cuentan como pago a cuenta a tu favor.",
      urgency: "calm",
      impact: "a tu favor (pago a cuenta)",
      risk: "bajo",
      estimatedTime: "2 min",
      source: "diagnostico",
      status: "todo",
      actionLabel: "Validar retención",
    });
  }

  if (draft.regime === "unsure") {
    pendingActions.push({
      id: "diag-regimen",
      type: "revisar_cfdi",
      title: "Confirmar tu régimen fiscal",
      description: "Estimamos con RESICO PF como referencia; confirma tu régimen para afinar el cálculo.",
      urgency: "calm",
      impact: "ajusta cómo se calcula tu ISR",
      risk: "medio",
      estimatedTime: "1 min",
      source: "diagnostico",
      status: "todo",
      actionLabel: "Confirmar régimen",
    });
  }

  const risks: Risk[] = [];
  if (draft.regime === "unsure") {
    risks.push({
      id: "diag-risk-regimen",
      severity: "info",
      title: "Régimen por confirmar",
      explanation: "El cálculo asume RESICO PF como referencia; confirma tu régimen para afinarlo.",
      source: "calculo",
      recommendedAction: "Confirmar régimen",
    });
  }
  if (draft.hasCfdiExpenses === "unsure") {
    risks.push({
      id: "diag-risk-iva",
      severity: "info",
      title: "IVA acreditable por revisar",
      explanation: "Aún no sabemos tus gastos con CFDI; podrían bajar tu IVA a pagar.",
      source: "calculo",
      recommendedAction: "Revisar IVA acreditable",
    });
  }
  if (draft.hasRetentions === "unsure") {
    risks.push({
      id: "diag-risk-retencion",
      severity: "atencion",
      title: "Retención por validar",
      explanation: "Una retención sin validar puede cambiar tu cálculo (cuenta a tu favor).",
      source: "calculo",
      recommendedAction: "Validar retención",
    });
  }

  return {
    id: `mes-${draft.period}-diag`,
    userId: "self",
    year,
    month,
    monthLabel: draft.monthLabel,
    regime: draft.regime === "honorarios" ? "honorarios" : "resico_pf",
    regimeLabel: draft.regimeLabel,
    status: "diagnostico_guardado",
    progress: draft.estimateSummary.readinessPct,
    deadline: deadlineIsoFromPeriod(draft.period),
    incomeDetected: draft.incomeApprox, // aproximado, auto-reportado en el diagnóstico
    incomeConfirmed: 0, // nada confirmado con CFDIs aún
    cfdisIssued: 0,
    cfdisReceived: 0,
    isrEstimate: draft.estimateSummary.isrEstimado ?? 0,
    ivaEstimate: draft.estimateSummary.ivaTrasladado ?? 0,
    retentions: 0,
    nextBestAction: traerCfdis,
    pendingActions,
    risks,
    satGuideStatus: "no_aplica",
    evidenceStatus: "vacio",
    historyPreview: [],
    createdAt: draft.createdAt,
    updatedAt: draft.createdAt,
  };
}
