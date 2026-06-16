/**
 * Fiscal Inbox — lógica pura (Fase 5C).
 *
 * Convierte cada CFDI (redactado, sin UUID/RFC/XML) en una DECISIÓN: título humano, impacto,
 * estado y la acción del usuario (confirmar / excluir / por revisar). Sin tabla técnica.
 * Funciones puras → testeables sin render. "Wedge prepara; tú validas en SAT."
 */

import type { StatusKind } from "@/design-system/components/StatusChip";
import type { CfdiStatus } from "./types";
import type { RedactedCfdi } from "./upload";
import { isUserIncome, isUserExpense } from "./classify";

/** Decisión temporal del usuario sobre un CFDI (solo en esta sesión, no se persiste). */
export type InboxDecision = "confirmado" | "excluido" | "revisar";

export type InboxFilter =
  | "todos"
  | "revision"
  | "ingresos"
  | "gastos"
  | "retenciones"
  | "cancelados"
  | "excluidos";

const mxn = (n: number) => "$" + Math.round(n).toLocaleString("es-MX");

function hasRetencion(c: RedactedCfdi): boolean {
  return c.taxes.isrRetenido > 0 || c.taxes.ivaRetenido > 0;
}

/**
 * Estado EFECTIVO: la decisión del usuario sobrescribe el estado detectado.
 * EXCEPTO en estados TERMINALES definidos por el comprobante (cancelado / pendiente de
 * complemento): ahí la decisión NO aplica — no se puede "confirmar" un cancelado. Esto evita
 * conteos contradictorios (un cancelado marcado verde) y dobles conteos en el resumen.
 */
export function effectiveStatus(cfdi: RedactedCfdi, decision?: InboxDecision): CfdiStatus {
  if (cfdi.status === "cancelado" || cfdi.status === "pendienteComplemento") return cfdi.status;
  if (decision === "confirmado") return "confirmado";
  if (decision === "excluido") return "excluido";
  if (decision === "revisar") return "requiereRevision";
  return cfdi.status;
}

/** ¿El usuario puede decidir sobre este CFDI? (los estados terminales los define el comprobante). */
export function isDecidable(cfdi: RedactedCfdi): boolean {
  return cfdi.status !== "cancelado" && cfdi.status !== "pendienteComplemento";
}

/** Título humano seguro (sin RFC/UUID). */
export function cfdiTitle(c: RedactedCfdi): string {
  if (c.status === "cancelado") return "CFDI cancelado";
  if (c.status === "pendienteComplemento") return "Ingreso a plazos (PPD) — pendiente de complemento";
  if (c.type === "pago") return "Complemento de pago (REP)";
  if (c.type === "egreso") return "Nota de crédito (egreso)";
  if (c.type === "nomina") return "Recibo de nómina";
  if (c.direction === "desconocido") return "CFDI por revisar";
  if (isUserIncome(c.type, c.direction)) {
    return hasRetencion(c) ? "Ingreso con retención" : "Ingreso detectado";
  }
  if (isUserExpense(c.type, c.direction)) {
    return c.taxes.ivaTrasladado > 0 ? "Gasto con IVA por revisar" : "Gasto detectado";
  }
  return "CFDI detectado";
}

/** Impacto en lenguaje humano (estimado informativo). */
export function cfdiImpact(c: RedactedCfdi): string {
  if (c.status === "cancelado") return "No cuenta en tu cálculo del mes.";
  if (c.status === "pendienteComplemento") return "Aún no cuenta como cobrado; falta el complemento de pago.";
  if (c.type === "pago") return "Comprobante de pago; no suma un ingreso nuevo.";
  if (c.type === "egreso") {
    if (c.direction === "recibido") return "Puede reducir un gasto del mes (por revisar).";
    if (c.direction === "emitido") return "Puede reducir un ingreso del mes (por revisar).";
    return "Nota de crédito; revísala para tu cálculo del mes.";
  }
  if (c.type === "nomina") return "Recibo de nómina; revísalo aparte.";
  if (c.direction === "desconocido") return "No pudimos determinar si lo emitiste o recibiste.";
  if (isUserIncome(c.type, c.direction)) {
    const base = `Sumaría ${mxn(c.subtotal)} a tus ingresos del mes (estimado).`;
    return hasRetencion(c)
      ? `${base} Retención de ${mxn(c.taxes.isrRetenido + c.taxes.ivaRetenido)} a tu favor (por revisar).`
      : base;
  }
  if (isUserExpense(c.type, c.direction)) {
    return c.taxes.ivaTrasladado > 0
      ? `Puede acreditar ${mxn(c.taxes.ivaTrasladado)} de IVA (por revisar).`
      : "Gasto sin IVA acreditable detectado.";
  }
  return "Revisa este comprobante.";
}

/** Mapea el estado del CFDI a un StatusChip del DS (con label override cuando hace falta). */
export function cfdiStatusChip(status: CfdiStatus): { kind: StatusKind; label?: string } {
  switch (status) {
    case "detectado": return { kind: "detectado" };
    case "requiereRevision": return { kind: "requiereRevision" };
    case "confirmado": return { kind: "confirmado" };
    case "excluido": return { kind: "excluido" };
    case "cancelado": return { kind: "requiereRevision", label: "Cancelado" };
    case "pendienteComplemento": return { kind: "requiereRevision", label: "Pendiente de complemento" };
    default: return { kind: "sinDatos", label: "Desconocido" };
  }
}

export interface InboxSummary {
  total: number;
  requierenRevision: number;
  confirmados: number;
  excluidos: number;
  cancelados: number;
  pendientesComplemento: number;
  ingresosCount: number;
  gastosCount: number;
}

/** Conteos derivados del estado EFECTIVO (decisión del usuario incluida). */
export function inboxSummary(
  items: RedactedCfdi[],
  decisions: Record<string, InboxDecision>,
): InboxSummary {
  const s: InboxSummary = {
    total: items.length,
    requierenRevision: 0, confirmados: 0, excluidos: 0,
    cancelados: 0, pendientesComplemento: 0, ingresosCount: 0, gastosCount: 0,
  };
  for (const c of items) {
    const eff = effectiveStatus(c, decisions[c.id]);
    if (eff === "requiereRevision") s.requierenRevision++;
    if (eff === "confirmado") s.confirmados++;
    if (eff === "excluido") s.excluidos++;
    if (c.status === "cancelado") s.cancelados++;
    if (c.status === "pendienteComplemento") s.pendientesComplemento++;
    // Conteos sobre CFDIs VIVOS (mismo universo que el monto "Ingresos detectados", que
    // excluye cancelados) para que conteo y cifra no diverjan.
    const vivo = c.status !== "cancelado";
    if (vivo && isUserIncome(c.type, c.direction)) s.ingresosCount++;
    if (vivo && isUserExpense(c.type, c.direction)) s.gastosCount++;
  }
  return s;
}

export interface DecisionSummary {
  confirmed: number;
  excluded: number;
  review: number;
}

/**
 * Aplica las decisiones del usuario a los CFDIs → lista con `status` EFECTIVO.
 * Los estados terminales (cancelado/pendienteComplemento) quedan intactos (effectiveStatus
 * los respeta). Se usa para recalcular el Mes Fiscal con las decisiones (Fase 5D).
 */
export function applyCfdiDecisions(
  cfdis: RedactedCfdi[],
  decisions: Record<string, InboxDecision>,
): RedactedCfdi[] {
  return cfdis.map((c) => {
    const eff = effectiveStatus(c, decisions[c.id]);
    return eff === c.status ? c : { ...c, status: eff };
  });
}

/** Cuenta las decisiones del usuario sobre CFDIs DECIDIBLES (ignora terminales). */
export function summarizeCfdiDecisions(
  cfdis: RedactedCfdi[],
  decisions: Record<string, InboxDecision>,
): DecisionSummary {
  const s: DecisionSummary = { confirmed: 0, excluded: 0, review: 0 };
  for (const c of cfdis) {
    if (!isDecidable(c)) continue;
    const d = decisions[c.id];
    if (d === "confirmado") s.confirmed++;
    else if (d === "excluido") s.excluded++;
    else if (d === "revisar") s.review++;
  }
  return s;
}

/** Filtra la bandeja por el chip de filtro seleccionado. */
export function filterItems(
  items: RedactedCfdi[],
  decisions: Record<string, InboxDecision>,
  filter: InboxFilter,
): RedactedCfdi[] {
  switch (filter) {
    case "todos": return items;
    case "revision": return items.filter((c) => effectiveStatus(c, decisions[c.id]) === "requiereRevision");
    case "ingresos": return items.filter((c) => isUserIncome(c.type, c.direction));
    case "gastos": return items.filter((c) => isUserExpense(c.type, c.direction));
    // Solo retenciones de INGRESO del usuario, para alinear con el monto "Retenciones" del resumen.
    case "retenciones": return items.filter((c) => isUserIncome(c.type, c.direction) && hasRetencion(c));
    case "cancelados": return items.filter((c) => c.status === "cancelado");
    // "excluidos" = DECISIÓN del usuario (estado efectivo); "cancelados" = estado del comprobante.
    // No se solapan a propósito: un cancelado es su propia categoría.
    case "excluidos": return items.filter((c) => effectiveStatus(c, decisions[c.id]) === "excluido");
    default: return items;
  }
}
