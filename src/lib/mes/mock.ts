/**
 * Mes Fiscal — datos de EJEMPLO (Fase 4A/4B).
 *
 * Fixture para construir y validar la vista `/app/mes` sin datos reales. El ISR se calcula
 * con el motor canónico REAL (`@/lib/tax/resico`, RESICO PF Art. 113-E) sobre ingresos mock —
 * el cálculo NO se mockea; los CFDIs de entrada sí. IVA/retenciones son montos de ejemplo.
 * Fechas fijas (no `Date.now()`), es un ejemplo estable.
 *
 * NO representa datos reales de ningún usuario (sin RFC, sin CFDIs reales, sin info personal).
 * La UI debe etiquetarlo "datos de ejemplo".
 */

import { calcISRBruto } from "@/lib/tax/resico";
import type { FiscalMonth, PendingAction } from "./types";

const INCOME_CONFIRMED = 48_200;

const NEXT_ACTION: PendingAction = {
  id: "pa-1",
  type: "confirmar_ingreso",
  title: "Confirmar 2 ingresos cobrados",
  description: "2 CFDIs detectados sin confirmar. Impactan tu ISR del mes.",
  urgency: "soon",
  impact: "+ $9,400 a tus ingresos confirmados",
  risk: "bajo",
  estimatedTime: "2 min",
  source: "cfdi",
  status: "current",
  actionLabel: "Revisar ingresos",
};

/** Mes Fiscal de ejemplo: Junio 2026, RESICO PF, 64% listo, en revisión. */
export function getMockFiscalMonth(): FiscalMonth {
  const isr = calcISRBruto(INCOME_CONFIRMED).isr; // motor real (Art. 113-E)

  return {
    id: "mes-2026-06-demo",
    userId: "demo",
    year: 2026,
    month: 6,
    monthLabel: "Junio 2026",
    regime: "resico_pf",
    regimeLabel: "RESICO PF",
    status: "en_revision",
    progress: 64,
    deadline: "2026-07-17",
    incomeDetected: 57_600,
    incomeConfirmed: INCOME_CONFIRMED,
    cfdisIssued: 8,
    cfdisReceived: 5,
    isrEstimate: isr,
    ivaEstimate: 2_180,
    retentions: 960,
    nextBestAction: NEXT_ACTION,
    pendingActions: [
      NEXT_ACTION,
      {
        id: "pa-2",
        type: "revisar_iva",
        title: "Revisar IVA acreditable",
        description: "3 gastos con CFDI podrían cambiar tu IVA del mes.",
        urgency: "calm",
        impact: "hasta − $640 de IVA a pagar",
        risk: "ninguno",
        estimatedTime: "3 min",
        source: "cfdi",
        status: "todo",
        actionLabel: "Revisar IVA",
      },
      {
        id: "pa-3",
        type: "validar_retencion",
        title: "Validar una retención",
        description: "Un cliente persona moral te retuvo ISR e IVA.",
        urgency: "calm",
        impact: "$960 a tu favor (pago a cuenta)",
        risk: "bajo",
        estimatedTime: "1 min",
        source: "cfdi",
        status: "todo",
        actionLabel: "Validar retención",
      },
      {
        id: "pa-4",
        type: "revisar_cfdi",
        title: "Revisar un CFDI cancelado",
        description: "Un CFDI ya cancelado por el emisor sigue contando en tu mes.",
        urgency: "calm",
        impact: "− $9,400 si lo excluyes",
        risk: "medio",
        estimatedTime: "1 min",
        source: "cfdi",
        status: "todo",
        actionLabel: "Revisar CFDI",
      },
    ],
    risks: [
      {
        id: "risk-1",
        severity: "atencion",
        title: "Un CFDI cancelado puede cambiar tu ingreso",
        explanation: "Un CFDI que ya estaba en tu mes fue cancelado por el emisor; si no lo excluyes, infla tu ingreso y tu ISR.",
        source: "cfdi",
        recommendedAction: "Excluir del mes",
      },
      {
        id: "risk-2",
        severity: "info",
        title: "IVA acreditable requiere revisión",
        explanation: "Tienes gastos con CFDI que aún no consideras; revisarlos puede bajar tu IVA a pagar.",
        source: "calculo",
        recommendedAction: "Revisar IVA acreditable",
      },
      {
        id: "risk-3",
        severity: "atencion",
        title: "Una retención pendiente puede cambiar tu cálculo",
        explanation: "Una retención de un cliente persona moral aún no está validada; cuenta como pago a cuenta a tu favor.",
        source: "cfdi",
        recommendedAction: "Validar retención",
      },
    ],
    satGuideStatus: "disponible",
    evidenceStatus: "parcial",
    // Historial de EJEMPLO (la UI lo etiqueta "Ejemplo" en modo demo). Solo meses PREVIOS
    // (no incluir el mes activo Junio 2026, que ya es la cabecera).
    historyPreview: [
      { monthLabel: "Mayo 2026", status: "marcado_presentado" },
      { monthLabel: "Abril 2026", status: "marcado_presentado" },
    ],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-13T00:00:00.000Z",
  };
}

/** Días al día 17 desde una fecha dada (para derivar urgency sin `Date.now()` en el módulo). */
export function daysToDeadline(deadlineIso: string, from: Date): number {
  const deadline = new Date(deadlineIso);
  const ms = deadline.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
