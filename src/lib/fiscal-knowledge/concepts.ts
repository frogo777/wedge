/**
 * Fiscal Knowledge v0 — conceptos curados (Fase 6B).
 *
 * Determinístico. Conocimiento fiscal GENERAL o reglas del propio producto; NO cita fuentes
 * oficiales (no se cargó/validó ninguna en esta fase). Lenguaje informativo, sin certeza absoluta.
 */

import type { FiscalConcept } from "./types";

export const FISCAL_CONCEPTS: Record<string, FiscalConcept> = {
  cfdi_cancelado: {
    id: "cfdi_cancelado",
    title: "CFDI cancelado",
    shortDefinition: "Un CFDI cancelado es un comprobante que el emisor anuló.",
    userSafeExplanation: "Normalmente un comprobante cancelado no debería contar en tu cálculo del mes; a veces se sustituye por otro CFDI vigente.",
    reviewQuestions: ["¿El emisor lo sustituyó por otro CFDI?", "¿Sigue correspondiendo a un ingreso o gasto real?"],
    relatedSignalTypes: ["cfdi_cancelado"],
    caution: "Si no estás seguro de si debe contar, consulta a un contador.",
    sourceLevel: "general",
  },
  ppd_sin_complemento: {
    id: "ppd_sin_complemento",
    title: "PPD sin complemento de pago",
    shortDefinition: "PPD es un pago en parcialidades o diferido; se cobra cuando llega su complemento de pago (REP).",
    userSafeExplanation: "Con flujo de efectivo, un CFDI PPD normalmente NO cuenta como ingreso del mes hasta que llega su complemento de pago (REP), que confirma el cobro.",
    reviewQuestions: ["¿Ya cobraste esta factura?", "¿Tienes su complemento de pago (REP)?"],
    relatedSignalTypes: ["ppd_sin_complemento"],
    caution: "Si la fecha de cobro no está clara, consulta a un contador.",
    sourceLevel: "general",
  },
  iva_acreditable: {
    id: "iva_acreditable",
    title: "IVA acreditable por revisar",
    shortDefinition: "El IVA acreditable es el IVA de tus gastos que puede restarse al IVA que trasladas.",
    userSafeExplanation: "Suele ser acreditable si el gasto es de tu actividad, está efectivamente pagado y tiene CFDI válido. No todo gasto aplica.",
    reviewQuestions: ["¿El gasto es de tu actividad?", "¿Está pagado y con CFDI vigente?"],
    relatedSignalTypes: ["iva_por_revisar"],
    caution: "Si dudas si un gasto es acreditable, consulta a un contador.",
    sourceLevel: "requires_review",
  },
  retencion: {
    id: "retencion",
    title: "Retención ISR / IVA",
    shortDefinition: "Una retención es un impuesto que un tercero (empresa o plataforma) te retuvo.",
    userSafeExplanation: "Las retenciones suelen contar como pago a cuenta a tu favor en tu ISR o IVA del periodo.",
    reviewQuestions: ["¿La retención aparece en tus CFDIs?", "¿El monto coincide con lo retenido?"],
    relatedSignalTypes: ["retencion_pendiente"],
    caution: "Si el monto no coincide, revísalo o consulta a un contador.",
    sourceLevel: "general",
  },
  ingresos_cobrados: {
    id: "ingresos_cobrados",
    title: "Ingresos detectados sin confirmar",
    shortDefinition: "Tus ingresos efectivamente cobrados forman, en general, la base de tu ISR del mes (después de excluir cancelados, PPD sin cobro y notas de crédito).",
    userSafeExplanation: "Confirmar es revisar que el ingreso corresponde a lo realmente cobrado en el periodo. No equivale a validarlo en SAT.",
    reviewQuestions: ["¿Lo cobraste dentro del mes?", "¿El monto es correcto?"],
    relatedSignalTypes: ["ingresos_sin_confirmar"],
    caution: "Si no sabes a qué periodo corresponde, consulta a un contador.",
    sourceLevel: "requires_review",
  },
  nota_credito: {
    id: "nota_credito",
    title: "Nota de crédito (egreso)",
    shortDefinition: "Un CFDI de egreso (a menudo una nota de crédito) suele ajustar un comprobante previo.",
    userSafeExplanation: "Puede reducir un ingreso (si lo emitiste) o un gasto (si lo recibiste), según a qué comprobante corresponda.",
    reviewQuestions: ["¿A qué comprobante corresponde?", "¿Reduce un ingreso o un gasto?"],
    relatedSignalTypes: ["egreso_por_revisar"],
    caution: "Si no es claro qué ajusta, consulta a un contador.",
    sourceLevel: "requires_review",
  },
  datos_incompletos: {
    id: "datos_incompletos",
    title: "CFDI con datos incompletos",
    shortDefinition: "Un CFDI con datos incompletos no trae toda la información que el cálculo necesita.",
    userSafeExplanation: "Si falta información (montos, impuestos), el cálculo estimado puede quedar corto; conviene revisar el XML completo.",
    reviewQuestions: ["¿El XML está completo?", "¿Falta algún dato clave (monto o impuestos)?"],
    relatedSignalTypes: ["datos_incompletos"],
    caution: "Si el comprobante parece dañado, vuelve a obtenerlo del emisor.",
    sourceLevel: "requires_review",
  },
  moneda_no_mxn: {
    id: "moneda_no_mxn",
    title: "CFDI en otra moneda",
    shortDefinition: "Un CFDI en moneda distinta a MXN requiere convertirse con su tipo de cambio.",
    userSafeExplanation: "El cálculo automático asume MXN; los CFDIs en otra moneda se excluyen hasta convertirlos a pesos.",
    reviewQuestions: ["¿Cuál es el tipo de cambio del CFDI?", "¿El equivalente en MXN es correcto?"],
    relatedSignalTypes: ["moneda_no_mxn"],
    caution: "Si manejas varias monedas, consulta a un contador.",
    sourceLevel: "requires_review",
  },
  mes_desde_diagnostico: {
    id: "mes_desde_diagnostico",
    title: "Mes Fiscal desde diagnóstico",
    shortDefinition: "El diagnóstico es una estimación inicial sin CFDIs cargados.",
    userSafeExplanation: "Sirve como punto de partida; la estimación se afina cuando cargas tus comprobantes (XML/ZIP).",
    reviewQuestions: ["¿Tus ingresos reales del mes coinciden con lo estimado?"],
    relatedSignalTypes: ["mes_desde_diagnostico"],
    caution: "El diagnóstico es informativo; no reemplaza tus comprobantes reales.",
    sourceLevel: "general",
  },
  confirmado_local: {
    id: "confirmado_local",
    title: "Confirmado localmente",
    shortDefinition: "Una confirmación local indica que ya revisaste ese comprobante en esta sesión.",
    userSafeExplanation: "Confirmar localmente reordena tu revisión; no cambia tus impuestos ni valida nada en SAT.",
    reviewQuestions: ["¿Revisaste cada CFDI antes de confirmarlo?"],
    relatedSignalTypes: ["confirmados_localmente"],
    caution: "Confirmar localmente solo reordena tu revisión; no cambia tus impuestos.",
    sourceLevel: "internal_rule",
  },
  excluido_local: {
    id: "excluido_local",
    title: "Excluido localmente",
    shortDefinition: "Una exclusión local saca un comprobante de tu cálculo estimado, solo en esta sesión.",
    userSafeExplanation: "Excluir localmente saca el CFDI del cálculo estimado; no equivale a cancelarlo en SAT.",
    reviewQuestions: ["¿La exclusión es correcta para este mes?"],
    relatedSignalTypes: ["excluidos_localmente"],
    caution: "Excluir localmente solo afecta tu cálculo estimado, no el comprobante en sí.",
    sourceLevel: "internal_rule",
  },
};

/** Índice señal-tipo → concepto, derivado de relatedSignalTypes. */
export const CONCEPT_BY_SIGNAL_TYPE: Record<string, FiscalConcept> = (() => {
  const out: Record<string, FiscalConcept> = {};
  for (const concept of Object.values(FISCAL_CONCEPTS)) {
    for (const t of concept.relatedSignalTypes) out[t] = concept;
  }
  return out;
})();
