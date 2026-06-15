/**
 * luk contextual — modelo de señal (Fase 6A).
 *
 * luk NO es chatbot ni "contador IA": detecta señales DETERMINÍSTICAS en el Mes Fiscal / CFDIs /
 * decisiones y las traduce en señal → impacto → riesgo → siguiente acción → límite.
 * Sin LLM, sin red. Distinto del luk legacy (`src/lib/luk/proactive/*`, server/Supabase).
 */

/** Severidad. "blocker" reservado para riesgo fiscal real (no se usa en 6A); rojo solo riesgo real. */
export type LukSeverity = "info" | "review" | "warning" | "blocker";

export type LukSignalType =
  | "cfdi_cancelado"
  | "ppd_sin_complemento"
  | "iva_por_revisar"
  | "retencion_pendiente"
  | "ingresos_sin_confirmar"
  | "egreso_por_revisar"
  | "datos_incompletos"
  | "moneda_no_mxn"
  | "mes_desde_diagnostico"
  | "confirmados_localmente"
  | "excluidos_localmente";

export type LukSignalSource =
  | "fiscal_month"
  | "cfdi_inbox"
  | "diagnostic"
  | "xml_preview"
  | "user_decision";

/** Confianza de la señal determinística (alta = condición dura; media = depende del usuario). */
export type LukConfidence = "alta" | "media";

export interface LukSignal {
  id: string;
  type: LukSignalType;
  severity: LukSeverity;
  /** Titular corto. */
  title: string;
  /** Resumen 1 línea. */
  summary: string;
  /** Qué le hace al cálculo. */
  impact: string;
  /** Qué riesgo hay si no se atiende (honesto, sin alarmismo). */
  risk: string;
  /** Siguiente acción concreta. */
  nextAction: string;
  source: LukSignalSource;
  confidence: LukConfidence;
  /** Explicación informativa, segura para mostrar (sin RFC/UUID/XML). */
  userSafeExplanation: string;
  /** Ids (hash NO sensibles) de CFDIs relacionados. */
  relatedCfdiIds: string[];
  /** ISO; se estampa desde el `now` que recibe el motor (puro). "" si no se pasó. */
  createdAt: string;
}

export interface LukSignalGroups {
  blocker: LukSignal[];
  warning: LukSignal[];
  review: LukSignal[];
  info: LukSignal[];
}
