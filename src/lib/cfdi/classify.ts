/**
 * CFDI Engine — classify layer (Fase 5A).
 *
 * Decide, sin inventar:
 *  - dirección (¿lo emitiste o lo recibiste? por RFC del usuario)
 *  - tipo documental (ingreso/egreso/pago/nómina/traslado)
 *  - estado del CFDI (detectado / requiereRevision / excluido / cancelado / pendienteComplemento)
 *
 * Regla: si falta información para clasificar con certeza, se marca `requiereRevision`
 * o `desconocido` — nunca se asume a favor del cálculo.
 */

import type { ParsedCFDI, CFDITipo } from "@/lib/cfdi-parser";
import type { CfdiType, CfdiDirection, CfdiStatus, CfdiExternalMeta } from "./types";

const TIPO_MAP: Record<CFDITipo, CfdiType> = {
  I: "ingreso",
  E: "egreso",
  P: "pago",
  N: "nomina",
  T: "traslado",
};

export function classifyType(tipo: CFDITipo | string | undefined): CfdiType {
  if (!tipo) return "desconocido";
  return TIPO_MAP[tipo as CFDITipo] ?? "desconocido";
}

function normRfc(rfc: string | null | undefined): string {
  return (rfc || "").trim().toUpperCase();
}

export function classifyDirection(parsed: ParsedCFDI, userRfc?: string | null): CfdiDirection {
  const user = normRfc(userRfc);
  if (!user) return "desconocido";
  if (normRfc(parsed.emisor.rfc) === user) return "emitido";
  if (normRfc(parsed.receptor.rfc) === user) return "recibido";
  return "desconocido";
}

/**
 * ¿Es un gasto del usuario? (CFDI de ingreso "I" recibido por el usuario = su gasto).
 * Los CFDIs tipo I que el usuario EMITE son su ingreso; los que RECIBE son su gasto.
 */
export function isUserExpense(type: CfdiType, direction: CfdiDirection): boolean {
  return type === "ingreso" && direction === "recibido";
}

/** ¿Es ingreso del usuario? (CFDI de ingreso "I" emitido por el usuario). */
export function isUserIncome(type: CfdiType, direction: CfdiDirection): boolean {
  return type === "ingreso" && direction === "emitido";
}

export function classifyStatus(
  parsed: ParsedCFDI,
  ctx: { type: CfdiType; meta?: CfdiExternalMeta; warnings: string[] },
): CfdiStatus {
  const { type, meta, warnings } = ctx;

  // 1) Cancelación (metadata externa — el XML no porta el estatus de cancelación).
  if (meta?.satStatus === "cancelado") return "cancelado";

  // 2) REP (complemento de pago): no es ingreso nuevo → se excluye del cálculo.
  if (type === "pago") return "excluido";

  // 3) PPD sin su complemento de pago: aún no cobrado → pendiente.
  if ((type === "ingreso" || type === "egreso") && parsed.metodoPago === "PPD") {
    if (meta?.hasComplementoPago !== true) return "pendienteComplemento";
  }

  // 4) Comprobante incompleto (sin timbre / sin fecha) → requiere revisión.
  if (!parsed.timbre?.uuid || !parsed.fecha) return "requiereRevision";

  // 5) Con retenciones → validar (cuentan a favor del usuario).
  const imp = parsed.impuestos;
  if (imp && (imp.totalISRRetenido > 0 || imp.totalIVARetenido > 0)) return "requiereRevision";

  // 6) Nómina / egreso (nota de crédito) / traslado → requieren revisión manual.
  if (type === "nomina" || type === "egreso" || type === "traslado") return "requiereRevision";

  // 7) Datos faltantes anotados → revisión.
  if (warnings.length > 0) return "requiereRevision";

  // 8) Ingreso/gasto limpio y timbrado → detectado (listo para que el usuario confirme).
  return "detectado";
}
