/**
 * IVA acreditable proporcional cuando el contribuyente tiene
 * actividades MIXTAS (gravadas + exentas / no objeto).
 *
 * Implementa Art. 5 frac. V incisos b) y c) LIVA.
 *
 * Cuándo aplica:
 *   - Arrendamiento mixto (parte habitacional EXENTA + parte comercial GRAVADA).
 *   - Médicos / dentistas / psicólogos cuyos servicios son EXENTOS
 *     pero compran insumos con IVA.
 *   - Actividades "no objeto" mezcladas con actividades gravadas.
 *
 * Mecánica del Art. 5 LIVA:
 *   1. IVA pagado IDENTIFICABLE 100% con actividad gravada → acreditable
 *      al 100%.
 *   2. IVA pagado IDENTIFICABLE 100% con actividad exenta → NO acreditable.
 *   3. IVA pagado en GASTOS COMUNES (renta de oficina, luz, papelería…)
 *      se acredita en la PROPORCIÓN que las actividades gravadas guardan
 *      con el total de actividades del contribuyente:
 *          factor = ingresos gravados / (ingresos gravados + exentos)
 *      IVA acreditable proporcional = IVA gastos comunes × factor
 *
 * Esta calculadora cubre el caso 3 (que es el complejo). El caller pasa
 * por separado el IVA "identificable" si quiere el agregado.
 */

import { round2 } from "../resico";

export interface CalcIvaProporcionalInput {
  /** Ingresos gravados a 16% / 8% / 0% del periodo (MXN, sin IVA). */
  ingresosGravados: number;
  /** Ingresos exentos del periodo (MXN). */
  ingresosExentos: number;
  /** IVA pagado en gastos COMUNES (no identificables) del periodo. */
  ivaGastosComunes: number;
  /** IVA pagado identificable 100% con gravadas (acreditable directo). */
  ivaIdentificableGravado?: number;
}

export interface CalcIvaProporcionalOk {
  ok: true;
  factorProporcion: number;          // 0 a 1
  porcentajeGravadas: number;        // 0 a 100, 2 decimales
  ivaAcreditableProporcional: number;
  ivaAcreditableIdentificable: number;
  ivaAcreditableTotal: number;
  ivaNoAcreditable: number;          // del IVA común que NO se acredita
  breakdown: string[];
}

export type CalcIvaProporcionalResult =
  | CalcIvaProporcionalOk
  | { ok: false; error: string };

export function calcIvaAcreditableProporcional(
  input: CalcIvaProporcionalInput,
): CalcIvaProporcionalResult {
  const grav = Number(input.ingresosGravados);
  const ex = Number(input.ingresosExentos);
  const ivaCom = Number(input.ivaGastosComunes);
  const ivaId = Number(input.ivaIdentificableGravado || 0);

  if (!Number.isFinite(grav) || grav < 0)
    return { ok: false, error: "ingresosGravados debe ser >= 0" };
  if (!Number.isFinite(ex) || ex < 0)
    return { ok: false, error: "ingresosExentos debe ser >= 0" };
  if (!Number.isFinite(ivaCom) || ivaCom < 0)
    return { ok: false, error: "ivaGastosComunes debe ser >= 0" };
  if (!Number.isFinite(ivaId) || ivaId < 0)
    return { ok: false, error: "ivaIdentificableGravado debe ser >= 0" };

  const totalActividades = grav + ex;
  // Caso degenerado: sin ingresos en el periodo. Art. 5-B LIVA permite
  // usar el factor del año anterior; sin info suficiente, devolvemos
  // factor 0 y el caller decide. Más conservador que asumir 1.
  const factor = totalActividades === 0 ? 0 : grav / totalActividades;
  const ivaAcredProp = round2(ivaCom * factor);
  const ivaNoAcred = round2(ivaCom - ivaAcredProp);
  const ivaAcredTotal = round2(ivaAcredProp + ivaId);

  const $ = (n: number) =>
    "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (r: number) => (r * 100).toFixed(2) + "%";

  const breakdown: string[] = [
    `Ingresos gravados: ${$(grav)}`,
    `Ingresos exentos: ${$(ex)}`,
    `Total actividades: ${$(totalActividades)}`,
    `Factor de proporción (gravadas / total): ${pct(factor)} (Art. 5 frac. V c LIVA)`,
    `IVA pagado en gastos COMUNES: ${$(ivaCom)}`,
    `IVA acreditable proporcional: ${$(ivaCom)} × ${pct(factor)} = ${$(ivaAcredProp)}`,
    `IVA NO acreditable (parte exenta): ${$(ivaNoAcred)}`,
    ivaId > 0
      ? `IVA identificable 100% gravado (acreditable directo): ${$(ivaId)}`
      : `Sin IVA identificable adicional`,
    `IVA acreditable TOTAL del periodo: ${$(ivaAcredTotal)}`,
  ];

  return {
    ok: true,
    factorProporcion: Math.round(factor * 1e6) / 1e6,
    porcentajeGravadas: Math.round(factor * 10000) / 100,
    ivaAcreditableProporcional: ivaAcredProp,
    ivaAcreditableIdentificable: round2(ivaId),
    ivaAcreditableTotal: ivaAcredTotal,
    ivaNoAcreditable: ivaNoAcred,
    breakdown,
  };
}
