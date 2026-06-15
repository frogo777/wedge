/**
 * CFDI Engine — taxes layer (Fase 5A).
 *
 * Convierte `NormalizedCfdi[]` en `Transaction[]` (el shape canónico que consumen
 * `buildMonthlyDeclaration` / `buildHonorariosDeclaration` de `@/lib/tax`). NO recalcula
 * impuestos a mano: delega en los motores canónicos para respetar exclusiones (cancelados,
 * REP "P"), cash-basis y reglas de IVA acreditable (Art. 5 LIVA / Art. 27-III LISR).
 *
 * Honestidad: solo INGRESOS (emitido) y GASTOS (recibido) claros, más REP (para que el
 * motor lo excluya), entran al mapeo. Egreso (nota de crédito), nómina y traslado NO se
 * suman automáticamente — se exponen como pendientes en `pending-actions`.
 */

import type { Transaction } from "@/lib/tax/resico";
import type { NormalizedCfdi } from "./types";
import { isUserIncome, isUserExpense } from "./classify";

function dateOnly(iso: string): string {
  return (iso || "").slice(0, 10);
}

/** Estatus para el motor tax: cancelado → "cancelado"; resto timbrado/vigente. */
function txCfdiStatus(c: NormalizedCfdi): Transaction["cfdi_status"] {
  return c.status === "cancelado" ? "cancelado" : "timbrado";
}

/** Letra de TipoDeComprobante para el motor (P se excluye allí). */
function cfdiTipoLetter(c: NormalizedCfdi): string {
  switch (c.type) {
    case "ingreso": return "I";
    case "egreso": return "E";
    case "pago": return "P";
    case "nomina": return "N";
    case "traslado": return "T";
    default: return "I";
  }
}

/**
 * Mapea un solo CFDI a Transaction, o null si no debe entrar al cálculo automático
 * (egreso/nómina/traslado/desconocido → se revisan aparte).
 */
export function cfdiToTransaction(c: NormalizedCfdi): Transaction | null {
  // EXCLUIDO: REP (complemento de pago, status "excluido" por el clasificador) o decisión del
  // usuario en el Fiscal Inbox (Fase 5D). En ambos casos NO entra al cálculo del mes.
  if (c.status === "excluido") return null;

  // 5A: solo MXN entra al cálculo automático. Otra moneda requiere tipo de cambio del CFDI
  // (Fase 5B); sumarla sin convertir falsearía la base de ISR/IVA → se excluye del auto-cálculo
  // (el warning de moneda ya se anotó en normalize).
  if (c.currency !== "MXN") return null;

  // 5A: un PPD NO se auto-reconoce como cobrado. El ingreso PPD se causa en el periodo de
  // la fechaPago de su complemento (REP); sin la conciliación REP→PPD no podemos fechar el
  // cobro correctamente, así que lo dejamos como pendiente (no se suma). "Si falta info, lo decimos."
  const cobrado = c.paymentMethod !== "PPD" && c.status !== "pendienteComplemento";
  const base: Omit<Transaction, "type"> = {
    id: c.id,
    description: c.concepts[0]?.description || c.issuerName || "CFDI",
    amount: c.subtotal,
    date: dateOnly(c.issuedAt),
    category: null,
    cfdi_status: txCfdiStatus(c),
    cfdi_tipo: cfdiTipoLetter(c),
    forma_pago: c.paymentForm,
    iva: c.taxes.ivaTrasladado,
    isr_retenido: null,
    iva_retenido: null,
    es_deducible: null,
    efectivamente_cobrado: cobrado,
    receptor_rfc: null,
  };

  if (isUserIncome(c.type, c.direction)) {
    return {
      ...base,
      type: "in",
      isr_retenido: c.taxes.isrRetenido,
      iva_retenido: c.taxes.ivaRetenido,
    };
  }

  if (isUserExpense(c.type, c.direction)) {
    // Gasto: IVA acreditable solo si el motor lo valida (deducible + vigente + bancarizado).
    return { ...base, type: "out", es_deducible: true };
  }

  // egreso / nómina / traslado / dirección desconocida → no se suma automáticamente.
  return null;
}

export function cfdisToTransactions(cfdis: NormalizedCfdi[]): Transaction[] {
  return cfdis.map(cfdiToTransaction).filter((t): t is Transaction => t !== null);
}

export interface CfdiTaxSummary {
  countIncome: number;       // CFDIs de ingreso del usuario (emitidos, no cancelados)
  countExpense: number;      // CFDIs de gasto del usuario (recibidos, no cancelados)
  ingresosDetectados: number;
  ivaTrasladado: number;
  ivaRetenido: number;
  isrRetenido: number;
}

/** Resumen rápido (no fiscal-definitivo) de los CFDIs vivos del usuario. */
export function summarizeCfdiTaxes(cfdis: NormalizedCfdi[]): CfdiTaxSummary {
  const vivos = cfdis.filter((c) => c.status !== "cancelado");
  const ingresos = vivos.filter((c) => isUserIncome(c.type, c.direction));
  const gastos = vivos.filter((c) => isUserExpense(c.type, c.direction));
  return {
    countIncome: ingresos.length,
    countExpense: gastos.length,
    ingresosDetectados: round2(ingresos.reduce((s, c) => s + c.subtotal, 0)),
    ivaTrasladado: round2(ingresos.reduce((s, c) => s + c.taxes.ivaTrasladado, 0)),
    ivaRetenido: round2(ingresos.reduce((s, c) => s + c.taxes.ivaRetenido, 0)),
    isrRetenido: round2(ingresos.reduce((s, c) => s + c.taxes.isrRetenido, 0)),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
