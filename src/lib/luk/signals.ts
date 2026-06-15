/**
 * luk contextual — motor DETERMINÍSTICO de señales (Fase 6A).
 *
 * Deriva señales de datos YA existentes (FiscalMonth, CFDIs redactados, decisiones temporales).
 * Sin LLM, sin red, sin alucinación. Cada señal = condición real → señal/impacto/riesgo/acción.
 * "No dato sin acción." No duplica pending actions literalmente: explica y prioriza.
 * Las señales NUNCA incluyen RFC/UUID/XML (relatedCfdiIds = ids hash no sensibles).
 */

import type { FiscalMonth } from "@/lib/mes/types";
import type { RedactedCfdi } from "@/lib/cfdi/upload";
import { isUserIncome, isUserExpense } from "@/lib/cfdi/classify";
import { effectiveStatus, isDecidable, type InboxDecision } from "@/lib/cfdi/inbox";
import type { LukSignal, LukSignalType, LukSignalSource, LukSignalGroups } from "./types";

interface SignalTemplate {
  severity: LukSignal["severity"];
  confidence: LukSignal["confidence"];
  title: string;
  summary: string;
  impact: string;
  risk: string;
  nextAction: string;
  userSafeExplanation: string;
}

const TEMPLATES: Record<LukSignalType, SignalTemplate> = {
  cfdi_cancelado: {
    severity: "warning", confidence: "alta",
    title: "Hay un CFDI cancelado por revisar.",
    summary: "Detectamos comprobante(s) cancelado(s) en tu mes.",
    impact: "Puede cambiar tus ingresos o gastos del mes.",
    risk: "Si lo cuentas por error, tu estimación puede quedar inflada.",
    nextAction: "Confirma si fue sustituido por otro CFDI.",
    userSafeExplanation: "Un CFDI cancelado normalmente no debe contar en tu cálculo del mes.",
  },
  ppd_sin_complemento: {
    severity: "warning", confidence: "alta",
    title: "Hay un ingreso a plazos (PPD) sin complemento.",
    summary: "Un CFDI con método PPD aún no tiene su complemento de pago.",
    impact: "Ese ingreso no cuenta como cobrado hasta tener el complemento (REP).",
    risk: "Si falta el complemento, tu estimación puede quedar incompleta.",
    nextAction: "Confirma el complemento de pago cuando lo tengas.",
    userSafeExplanation: "Con flujo de efectivo, un PPD se cuenta cuando se cobra (su complemento).",
  },
  iva_por_revisar: {
    severity: "review", confidence: "media",
    title: "Hay IVA acreditable por confirmar.",
    summary: "Algunos gastos con CFDI podrían acreditar IVA.",
    impact: "Puede bajar el IVA estimado si corresponde a tu actividad.",
    risk: "Si no aplica a tu actividad, no debería contarse.",
    nextAction: "Revisa los gastos con IVA antes del día 17.",
    userSafeExplanation: "El IVA acreditable depende de que el gasto sea de tu actividad y esté pagado.",
  },
  retencion_pendiente: {
    severity: "review", confidence: "media",
    title: "Hay una retención por revisar.",
    summary: "Detectamos retención en uno o más CFDIs.",
    impact: "Puede cambiar tu ISR o IVA a pagar.",
    risk: "Si no la validas, tu estimación puede ser incompleta.",
    nextAction: "Confirma la retención en tus CFDIs.",
    userSafeExplanation: "Las retenciones suelen contar como pago a cuenta a tu favor.",
  },
  ingresos_sin_confirmar: {
    severity: "review", confidence: "media",
    title: "Tienes ingresos detectados sin confirmar.",
    summary: "Hay CFDIs de ingreso que aún no confirmas.",
    impact: "Definen tu base de ISR del mes.",
    risk: "Si no los revisas, tu estimación puede no reflejar lo cobrado.",
    nextAction: "Confirma tus ingresos cobrados.",
    userSafeExplanation: "Confirmar es revisar; no equivale a validar en SAT.",
  },
  egreso_por_revisar: {
    severity: "review", confidence: "media",
    title: "Hay una nota de crédito (egreso) por revisar.",
    summary: "Detectamos un CFDI de egreso.",
    impact: "Puede reducir un ingreso o un gasto del mes.",
    risk: "Si no se revisa, el cálculo puede quedar desajustado.",
    nextAction: "Revisa la nota de crédito antes de cerrar el mes.",
    userSafeExplanation: "Una nota de crédito ajusta un comprobante previo.",
  },
  datos_incompletos: {
    severity: "review", confidence: "media",
    title: "Hay CFDIs con datos incompletos.",
    summary: "No pudimos leer todo de algunos comprobantes.",
    impact: "Podría faltar información en tu cálculo.",
    risk: "Si faltan datos, la estimación puede quedar corta.",
    nextAction: "Revisa esos CFDIs.",
    userSafeExplanation: "Un comprobante incompleto puede necesitar el XML completo.",
  },
  moneda_no_mxn: {
    severity: "review", confidence: "alta",
    title: "Hay CFDIs en otra moneda.",
    summary: "Detectamos comprobante(s) que no están en MXN.",
    impact: "Se excluyen del cálculo automático (requieren tipo de cambio).",
    risk: "Tu estimación no los incluye hasta convertirlos.",
    nextAction: "Revisa el tipo de cambio de esos CFDIs.",
    userSafeExplanation: "El cálculo asume MXN; otra moneda se revisa aparte.",
  },
  mes_desde_diagnostico: {
    severity: "info", confidence: "alta",
    title: "Tu Mes Fiscal empezó con diagnóstico.",
    summary: "Aún no has cargado CFDIs (XML/ZIP).",
    impact: "Sirve como punto de partida, pero falta CFDI/XML.",
    risk: "La estimación puede cambiar cuando cargues comprobantes.",
    nextAction: "Completa con XML/ZIP cuando estés listo.",
    userSafeExplanation: "El diagnóstico es una estimación inicial informativa.",
  },
  confirmados_localmente: {
    severity: "info", confidence: "alta",
    title: "Confirmaste CFDIs en esta sesión.",
    summary: "Marcaste comprobantes como confirmados localmente.",
    impact: "Reordena tu revisión; no cambia tus impuestos.",
    risk: "Es un cambio temporal de esta sesión; no se envía al servidor.",
    nextAction: "Sigue revisando lo que falta.",
    userSafeExplanation: "Confirmar localmente no equivale a validado por SAT.",
  },
  excluidos_localmente: {
    severity: "info", confidence: "alta",
    title: "Excluiste CFDIs en esta sesión.",
    summary: "Marcaste comprobantes como excluidos localmente.",
    impact: "Esos CFDIs salen del cálculo estimado.",
    risk: "Es un cambio temporal de esta sesión; no se envía al servidor.",
    nextAction: "Revisa que la exclusión sea correcta.",
    userSafeExplanation: "Excluir localmente no equivale a cancelado en SAT.",
  },
};

const SEVERITY_RANK: Record<LukSignal["severity"], number> = { blocker: 4, warning: 3, review: 2, info: 1 };
/** Orden de desempate estable (más accionable primero dentro de la misma severidad). */
const TYPE_ORDER: LukSignalType[] = [
  "cfdi_cancelado", "ppd_sin_complemento", "moneda_no_mxn", "ingresos_sin_confirmar",
  "iva_por_revisar", "retencion_pendiente", "egreso_por_revisar", "datos_incompletos",
  "mes_desde_diagnostico", "excluidos_localmente", "confirmados_localmente",
];

function mk(
  type: LukSignalType,
  source: LukSignalSource,
  relatedCfdiIds: string[],
  now?: Date,
  overrides?: Partial<Pick<LukSignal, "title" | "summary">>,
): LukSignal {
  const t = TEMPLATES[type];
  return {
    id: `luk-${type}`,
    type,
    severity: t.severity,
    title: overrides?.title ?? t.title,
    summary: overrides?.summary ?? t.summary,
    impact: t.impact,
    risk: t.risk,
    nextAction: t.nextAction,
    source,
    confidence: t.confidence,
    userSafeExplanation: t.userSafeExplanation,
    relatedCfdiIds,
    createdAt: now ? now.toISOString() : "",
  };
}

const ids = (cfdis: RedactedCfdi[]) => cfdis.map((c) => c.id);
const pendiente = (s: string) => s === "detectado" || s === "requiereRevision";

/** Señales derivadas de los CFDIs + decisiones (la fuente más rica). */
export function buildLukSignalsFromCfdis(
  cfdis: RedactedCfdi[],
  decisions: Record<string, InboxDecision>,
  _month: FiscalMonth,
  now?: Date,
): LukSignal[] {
  const eff = (c: RedactedCfdi) => effectiveStatus(c, decisions[c.id]);
  const out: LukSignal[] = [];

  const cancelados = cfdis.filter((c) => c.status === "cancelado");
  if (cancelados.length) out.push(mk("cfdi_cancelado", "cfdi_inbox", ids(cancelados), now,
    cancelados.length > 1 ? { title: `Hay ${cancelados.length} CFDIs cancelados por revisar.` } : undefined));

  const ppd = cfdis.filter((c) => c.status === "pendienteComplemento");
  if (ppd.length) out.push(mk("ppd_sin_complemento", "cfdi_inbox", ids(ppd), now));

  const noMxn = cfdis.filter((c) => c.currency !== "MXN");
  if (noMxn.length) out.push(mk("moneda_no_mxn", "cfdi_inbox", ids(noMxn), now));

  const ingresos = cfdis.filter((c) => isUserIncome(c.type, c.direction) && pendiente(eff(c)));
  if (ingresos.length) {
    const conRet = ingresos.filter((c) => c.taxes.isrRetenido > 0 || c.taxes.ivaRetenido > 0);
    out.push(mk("ingresos_sin_confirmar", "cfdi_inbox", ids(ingresos), now,
      ingresos.length > 1 ? { title: `Tienes ${ingresos.length} ingresos detectados sin confirmar.` } : undefined));
    if (conRet.length) out.push(mk("retencion_pendiente", "cfdi_inbox", ids(conRet), now));
  }

  const gastosIva = cfdis.filter((c) => isUserExpense(c.type, c.direction) && c.taxes.ivaTrasladado > 0 && pendiente(eff(c)));
  if (gastosIva.length) out.push(mk("iva_por_revisar", "cfdi_inbox", ids(gastosIva), now));

  const egresos = cfdis.filter((c) => c.type === "egreso" && eff(c) !== "excluido");
  if (egresos.length) out.push(mk("egreso_por_revisar", "cfdi_inbox", ids(egresos), now));

  const incompletos = cfdis.filter((c) => c.status !== "cancelado" && c.warnings.length > 0 && eff(c) === "requiereRevision");
  if (incompletos.length) out.push(mk("datos_incompletos", "cfdi_inbox", ids(incompletos), now));

  const confirmados = cfdis.filter((c) => isDecidable(c) && decisions[c.id] === "confirmado");
  if (confirmados.length) out.push(mk("confirmados_localmente", "user_decision", ids(confirmados), now,
    { title: `Confirmaste ${confirmados.length} CFDI${confirmados.length > 1 ? "s" : ""} en esta sesión.` }));

  const excluidos = cfdis.filter((c) => isDecidable(c) && decisions[c.id] === "excluido");
  if (excluidos.length) out.push(mk("excluidos_localmente", "user_decision", ids(excluidos), now,
    { title: `Excluiste ${excluidos.length} CFDI${excluidos.length > 1 ? "s" : ""} en esta sesión.` }));

  return out;
}

/** Mapea ids de Risk conocidos (from-cfdis/from-diagnostic) a tipos de señal luk. */
const RISK_ID_TO_TYPE: Record<string, LukSignalType> = {
  "cfdi-risk-cancelado": "cfdi_cancelado",
  "cfdi-risk-ppd": "ppd_sin_complemento",
  "cfdi-risk-egreso": "egreso_por_revisar",
  "cfdi-risk-incompletos": "datos_incompletos",
  "diag-risk-iva": "iva_por_revisar",
  "diag-risk-retencion": "retencion_pendiente",
};

/**
 * Señales derivadas SOLO del FiscalMonth (cuando no hay lista de CFDIs en mano: diagnóstico,
 * o `/app/mes` que solo tiene el mes). Mapea risks por id + pending actions → tipos de señal.
 */
export function buildLukSignalsFromFiscalMonth(month: FiscalMonth, now?: Date): LukSignal[] {
  const out: LukSignal[] = [];
  const added = new Set<LukSignalType>();
  const push = (type: LukSignalType, source: LukSignalSource) => {
    if (added.has(type)) return;
    added.add(type);
    out.push(mk(type, source, [], now));
  };
  if (month.status === "diagnostico_guardado") push("mes_desde_diagnostico", "diagnostic");
  for (const r of month.risks) {
    const t = RISK_ID_TO_TYPE[r.id];
    if (t) push(t, "fiscal_month");
  }
  for (const p of month.pendingActions) {
    if (p.type === "revisar_iva") push("iva_por_revisar", "fiscal_month");
    else if (p.type === "validar_retencion") push("retencion_pendiente", "fiscal_month");
    else if (p.type === "confirmar_ingreso") push("ingresos_sin_confirmar", "fiscal_month");
  }
  return out;
}

export function rankLukSignals(signals: LukSignal[]): LukSignal[] {
  const conf = (c: LukSignal["confidence"]) => (c === "alta" ? 2 : 1);
  return [...signals].sort((a, b) => {
    if (SEVERITY_RANK[b.severity] !== SEVERITY_RANK[a.severity]) return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (conf(b.confidence) !== conf(a.confidence)) return conf(b.confidence) - conf(a.confidence);
    return TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
  });
}

export interface LukContext {
  month: FiscalMonth;
  cfdis?: RedactedCfdi[];
  decisions?: Record<string, InboxDecision>;
  now?: Date;
}

/** Combina las fuentes, deduplica por tipo (prefiere la versión rica de CFDIs) y rankea. */
export function buildLukSignals(ctx: LukContext): LukSignal[] {
  const fromCfdis = ctx.cfdis && ctx.cfdis.length > 0
    ? buildLukSignalsFromCfdis(ctx.cfdis, ctx.decisions ?? {}, ctx.month, ctx.now)
    : [];
  const fromMonth = buildLukSignalsFromFiscalMonth(ctx.month, ctx.now);
  const seen = new Set<LukSignalType>();
  const merged = [...fromCfdis, ...fromMonth].filter((s) => (seen.has(s.type) ? false : (seen.add(s.type), true)));
  return rankLukSignals(merged);
}

/** La señal más accionable: la de mayor severidad que no sea puramente informativa, o la primera. */
export function getPrimaryLukSignal(signals: LukSignal[]): LukSignal | null {
  if (signals.length === 0) return null;
  const ranked = rankLukSignals(signals);
  return ranked.find((s) => s.severity !== "info") ?? ranked[0];
}

export function groupLukSignals(signals: LukSignal[]): LukSignalGroups {
  const g: LukSignalGroups = { blocker: [], warning: [], review: [], info: [] };
  for (const s of rankLukSignals(signals)) g[s.severity].push(s);
  return g;
}
