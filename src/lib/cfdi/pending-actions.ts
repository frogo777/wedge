/**
 * CFDI Engine — pending actions & risks (Fase 5A).
 *
 * Convierte CFDIs en pendientes accionables (PendingAction) y riesgos (Risk) del Mes Fiscal.
 * Patrón obligatorio: Estado → Impacto → Riesgo → Siguiente acción. "No dato sin acción."
 * Honesto: si falta info, genera un pendiente de revisión; no inventa cifras ni promete
 * exactitud. Copy seguro: "Wedge prepara; tú validas en SAT."
 */

import type { PendingAction, Risk, Urgency } from "@/lib/mes/types";
import type { NormalizedCfdi } from "./types";
import { isUserIncome, isUserExpense } from "./classify";

export interface CfdiSignalContext {
  /** Días al día 17 (para modular urgencia). null = desconocido. */
  daysToDeadline?: number | null;
}

function urgencyFromDeadline(days: number | null | undefined): Urgency {
  if (days == null) return "soon";
  if (days <= 3) return "due";
  if (days <= 10) return "soon";
  return "calm";
}

const mxn = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * Genera los pendientes del mes a partir de los CFDIs. Devueltos en orden de prioridad;
 * el primero queda en estado "current" (candidato a próxima mejor acción).
 */
export function pendingActionsFromCfdis(
  cfdis: NormalizedCfdi[],
  ctx: CfdiSignalContext = {},
): PendingAction[] {
  const vivos = cfdis.filter((c) => c.status !== "cancelado");
  // Solo los CFDIs aún SIN resolver generan pendientes constructivos: un "confirmado" o
  // "excluido" (decisión del usuario en el Inbox, Fase 5D) ya no pide acción → los pendientes
  // se reducen conforme el usuario decide.
  const pendiente = (c: NormalizedCfdi) => c.status === "detectado" || c.status === "requiereRevision";
  // R7.4B: "confirmar ingresos" cuenta solo ingresos COBRABLES en MXN (el motor canónico excluye
  // no-MXN y PPD). Evita inflar el monto con USD a valor nominal y alinea la cifra con "Ingresos
  // detectados" del Fiscal Inbox. Los PPD se cuentan aparte (pendiente de complemento).
  const ingresos = vivos.filter((c) => isUserIncome(c.type, c.direction) && pendiente(c) && c.currency === "MXN");
  const gastosConIva = vivos.filter((c) => isUserExpense(c.type, c.direction) && c.taxes.ivaTrasladado > 0 && pendiente(c));
  const conRetencion = vivos.filter((c) => isUserIncome(c.type, c.direction) && pendiente(c) && (c.taxes.isrRetenido > 0 || c.taxes.ivaRetenido > 0));
  const ppdSinComplemento = cfdis.filter((c) => c.status === "pendienteComplemento");
  const cancelados = cfdis.filter((c) => c.status === "cancelado");
  const egresos = cfdis.filter((c) => c.type === "egreso" && c.status !== "excluido");
  const incompletos = vivos.filter(
    (c) => c.status === "requiereRevision" && c.warnings.length > 0 && c.type !== "egreso",
  );

  const baseUrg = urgencyFromDeadline(ctx.daysToDeadline);
  const out: PendingAction[] = [];

  if (ingresos.length > 0) {
    const total = ingresos.reduce((s, c) => s + c.subtotal, 0);
    out.push({
      id: "cfdi-confirmar-ingresos",
      type: "confirmar_ingreso",
      title: `Confirmar ${ingresos.length} ${ingresos.length === 1 ? "ingreso" : "ingresos"} cobrado${ingresos.length === 1 ? "" : "s"}`,
      description: `Detectamos ${ingresos.length} ${ingresos.length === 1 ? "ingreso" : "ingresos"} cobrable${ingresos.length === 1 ? "" : "s"} en MXN (${mxn(total)} aprox.). Asumimos que los de pago en una exhibición (PUE) ya se cobraron —es un supuesto—; confírmalos para fijar tu base de ISR.${ppdSinComplemento.length > 0 ? ` (${ppdSinComplemento.length} ingreso${ppdSinComplemento.length === 1 ? "" : "s"} PPD se cuenta${ppdSinComplemento.length === 1 ? "" : "n"} aparte hasta su complemento.)` : ""}`,
      urgency: baseUrg,
      impact: "define tu base de ISR del mes",
      risk: "bajo",
      estimatedTime: "2 min",
      source: "cfdi",
      status: "todo",
      actionLabel: "Confirmar ingresos",
    });
  }

  if (gastosConIva.length > 0) {
    const ivaAcred = gastosConIva.reduce((s, c) => s + c.taxes.ivaTrasladado, 0);
    out.push({
      id: "cfdi-revisar-iva",
      type: "revisar_iva",
      title: "Revisar IVA acreditable",
      description: `${gastosConIva.length} ${gastosConIva.length === 1 ? "gasto" : "gastos"} con CFDI podrían acreditar IVA. Revisa que sean deducibles y estén pagados.`,
      urgency: "calm",
      impact: `puede bajar tu IVA a pagar (hasta ${mxn(ivaAcred)})`,
      risk: "ninguno",
      estimatedTime: "3 min",
      source: "cfdi",
      status: "todo",
      actionLabel: "Revisar IVA",
    });
  }

  if (conRetencion.length > 0) {
    const retTotal = conRetencion.reduce((s, c) => s + c.taxes.isrRetenido + c.taxes.ivaRetenido, 0);
    out.push({
      id: "cfdi-validar-retencion",
      type: "validar_retencion",
      title: "Validar tus retenciones",
      description: `${conRetencion.length} CFDI tienen retención (${mxn(retTotal)} aprox.). Cuentan como pago a cuenta a tu favor; valídalas.`,
      urgency: "calm",
      impact: "a tu favor (pago a cuenta)",
      risk: "bajo",
      estimatedTime: "2 min",
      source: "cfdi",
      status: "todo",
      actionLabel: "Validar retención",
    });
  }

  if (ppdSinComplemento.length > 0) {
    out.push({
      id: "cfdi-complemento-pago",
      type: "revisar_cfdi",
      title: "Confirmar complemento de pago (PPD)",
      description: `${ppdSinComplemento.length} CFDI PPD no tienen su complemento de pago. Hasta tener el REP, ese ingreso no cuenta como cobrado.`,
      urgency: baseUrg,
      impact: "ese ingreso aún no cuenta como cobrado",
      risk: "medio",
      estimatedTime: "3 min",
      source: "cfdi",
      status: "todo",
      actionLabel: "Revisar complemento",
    });
  }

  if (cancelados.length > 0) {
    out.push({
      id: "cfdi-cancelado",
      type: "revisar_cfdi",
      title: "Revisar CFDI cancelado",
      description: `${cancelados.length} CFDI están cancelados. No cuentan en tu cálculo; confirma que no los necesitas este mes.`,
      urgency: "calm",
      impact: "ya no cuenta en tu cálculo del mes",
      risk: "medio",
      estimatedTime: "1 min",
      source: "cfdi",
      status: "todo",
      actionLabel: "Revisar cancelado",
    });
  }

  if (egresos.length > 0) {
    out.push({
      id: "cfdi-egreso",
      type: "revisar_cfdi",
      title: "Revisar nota de crédito (egreso)",
      description: `${egresos.length} CFDI de egreso (nota de crédito). Puede reducir un ingreso; revísalo antes de cerrar el mes.`,
      urgency: "calm",
      impact: "puede reducir un ingreso del mes",
      risk: "bajo",
      estimatedTime: "2 min",
      source: "cfdi",
      status: "todo",
      actionLabel: "Revisar egreso",
    });
  }

  if (incompletos.length > 0) {
    out.push({
      id: "cfdi-incompletos",
      type: "revisar_cfdi",
      title: "Revisar CFDI con datos incompletos",
      description: `${incompletos.length} CFDI tienen datos que no pudimos leer del XML. Revísalos para no calcular de menos.`,
      urgency: "calm",
      impact: "podría faltar información en tu cálculo",
      risk: "medio",
      estimatedTime: "2 min",
      source: "cfdi",
      status: "todo",
      actionLabel: "Revisar datos",
    });
  }

  // Cierre: validar en SAT (Wedge prepara; tú validas y presentas).
  if (vivos.length > 0) {
    out.push({
      id: "cfdi-validar-sat",
      type: "validar_en_sat",
      title: "Validar y presentar en SAT",
      description: "Cuando confirmes lo anterior, tu cálculo queda listo para que lo valides y presentes en el SAT. Wedge prepara; tú validas en SAT.",
      urgency: "calm",
      impact: "cierra tu mes fiscal",
      risk: "ninguno",
      estimatedTime: "5 min",
      source: "cfdi",
      status: "todo",
      actionLabel: "Cómo validar en SAT",
    });
  }

  if (out.length > 0) out[0] = { ...out[0], status: "current" };
  return out;
}

/** Riesgos del mes (rojo/atención solo cuando es real). */
export function risksFromCfdis(cfdis: NormalizedCfdi[]): Risk[] {
  const risks: Risk[] = [];
  const cancelados = cfdis.filter((c) => c.status === "cancelado");
  const ppd = cfdis.filter((c) => c.status === "pendienteComplemento");
  const egresos = cfdis.filter((c) => c.type === "egreso");
  const incompletos = cfdis.filter(
    (c) => c.status === "requiereRevision" && c.warnings.length > 0 && c.type !== "egreso",
  );

  if (cancelados.length > 0) {
    risks.push({
      id: "cfdi-risk-cancelado",
      severity: "atencion",
      title: `${cancelados.length} CFDI cancelado${cancelados.length === 1 ? "" : "s"}`,
      explanation: "Un CFDI cancelado no cuenta en tu cálculo. Si correspondía a un ingreso real, podrías necesitar el comprobante vigente.",
      source: "cfdi",
      recommendedAction: "Revisar CFDI cancelado",
    });
  }

  if (ppd.length > 0) {
    risks.push({
      id: "cfdi-risk-ppd",
      severity: "atencion",
      title: "Ingreso PPD sin complemento de pago",
      explanation: "Un CFDI con método de pago PPD no cuenta como cobrado hasta que exista su complemento de pago (REP).",
      source: "cfdi",
      recommendedAction: "Confirmar complemento de pago",
    });
  }

  if (egresos.length > 0) {
    risks.push({
      id: "cfdi-risk-egreso",
      severity: "info",
      title: "Nota de crédito por revisar",
      explanation: "Un CFDI de egreso (nota de crédito) puede reducir un ingreso del mes. Revísalo para que el cálculo sea correcto.",
      source: "cfdi",
      recommendedAction: "Revisar nota de crédito",
    });
  }

  if (incompletos.length > 0) {
    risks.push({
      id: "cfdi-risk-incompletos",
      severity: "info",
      title: "CFDI con datos incompletos",
      explanation: "No pudimos leer todos los datos de algunos CFDIs. Revísalos para no calcular de menos.",
      source: "cfdi",
      recommendedAction: "Revisar datos incompletos",
    });
  }

  return risks;
}
