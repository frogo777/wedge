/**
 * Mes Fiscal — modelo conceptual (Fase 4A).
 *
 * El Mes Fiscal es el objeto central de Wedge: convierte CFDIs/ISR/IVA/retenciones/
 * pendientes en "esto está listo / esto falta / esto sigue", anclado al día 17.
 * Wedge prepara; el usuario valida y presenta en SAT.
 *
 * Estos types son la base para Fase 4B (UI con mock) y Fase 5+ (datos reales).
 * Los cálculos fiscales viven en `@/lib/tax` (motores canónicos), NO aquí.
 */

export type Regime = "resico_pf" | "honorarios";

/** Estado del CICLO del mes (macro). Un mes activo a la vez. */
export type MesEstado =
  | "sin_datos"
  | "diagnostico_guardado"
  | "datos_importados"
  | "en_revision"
  | "calculo_estimado"
  | "listo_para_validar"
  | "marcado_presentado"
  | "vencido";

/** Urgencia del prompt (Fogg) — mapea a ActionCard/DeadlinePill. Nunca "rojo" salvo vencido. */
export type Urgency = "calm" | "soon" | "due";

export type PendingActionType =
  | "confirmar_ingreso"
  | "revisar_iva"
  | "validar_retencion"
  | "traer_cfdis"
  | "revisar_cfdi"
  | "validar_en_sat";

export type PendingActionStatus = "todo" | "current" | "done";

export type RiskSeverity = "info" | "atencion" | "riesgo_real";

export interface PendingAction {
  id: string;
  type: PendingActionType;
  title: string;
  description: string;
  /** Urgencia del prompt; deriva de los días al día 17. */
  urgency: Urgency;
  /** Impacto en lenguaje humano, p. ej. "+ $2,180 a tu IVA del mes". */
  impact: string;
  risk: "ninguno" | "bajo" | "medio" | "alto";
  /** Tiempo estimado, p. ej. "2 min". */
  estimatedTime: string;
  source: "diagnostico" | "cfdi" | "luk" | "sat" | "manual";
  status: PendingActionStatus;
  /** CTA específico, p. ej. "Revisar IVA ahora". */
  actionLabel: string;
}

export interface Risk {
  id: string;
  severity: RiskSeverity;
  title: string;
  explanation: string;
  source: "cfdi" | "buzon_sat" | "calculo" | "deadline";
  recommendedAction: string;
}

/** Entrada de historial (preview de meses previos). */
export interface MonthHistoryEntry {
  monthLabel: string;
  status: MesEstado;
}

export interface FiscalMonth {
  id: string;
  userId: string;
  year: number;
  /** 1-12. */
  month: number;
  /** Etiqueta display, p. ej. "Junio 2026". */
  monthLabel: string;
  regime: Regime;
  /** Etiqueta display del régimen, p. ej. "RESICO PF". */
  regimeLabel: string;
  status: MesEstado;
  /** 0-100 (% listo). */
  progress: number;
  /** ISO — día 17 del mes siguiente. */
  deadline: string;
  incomeDetected: number;
  incomeConfirmed: number;
  cfdisIssued: number;
  cfdisReceived: number;
  /** Derivados de los motores canónicos de `@/lib/tax` (cálculo informativo). */
  isrEstimate: number;
  ivaEstimate: number;
  retentions: number;
  pendingActions: PendingAction[];
  risks: Risk[];
  /** El "esto sigue" único (la próxima mejor acción). */
  nextBestAction: PendingAction | null;
  satGuideStatus: "no_aplica" | "disponible" | "en_curso" | "completado";
  evidenceStatus: "vacio" | "parcial" | "completo";
  /** Preview de meses previos (historial). */
  historyPreview: MonthHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}
