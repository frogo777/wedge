/**
 * ISR sobre dividendos pagados por una Persona Moral mexicana a una
 * Persona Física residente en México.
 *
 * Implementa Arts. 10 y 140 LISR.
 *
 * Hay DOS niveles de ISR sobre el mismo dividendo:
 *
 *  A) ISR CORPORATIVO (Art. 10 LISR) — lo paga la PM cuando reparte
 *     dividendos que NO provienen de la CUFIN (Cuenta de Utilidad
 *     Fiscal Neta). Se piramida con el factor 1.4286 y se aplica la
 *     tasa del 30%:
 *         ISR_corp = dividendo × 1.4286 × 30%
 *     Si el dividendo SÍ viene de CUFIN → no hay ISR corporativo
 *     (las utilidades ya pagaron 30% en su momento).
 *     El dividendo NO se piramida ante el accionista; el efecto es a
 *     nivel de la PM. Para el bolsillo del accionista PF, el dividendo
 *     bruto recibido es el mismo monto pactado.
 *
 *  B) ISR ACCIONISTA (Art. 140 frac. V LISR, vigente 2014+) — la PM
 *     RETIENE 10% adicional al accionista PF, con carácter de PAGO
 *     DEFINITIVO. Aplica SIEMPRE que el dividendo provenga de utilidades
 *     generadas a partir de 2014, venga o no de CUFIN.
 *
 * Resultado neto en bolsillo del accionista PF:
 *     bolsillo = dividendo − retención 10%
 *
 * El ISR corporativo lo absorbe la PM (no reduce el dividendo del
 * accionista), pero si el caller quiere ver el costo TOTAL fiscal del
 * reparto, esta calculadora lo expone como `isrCorporativoPM`.
 */

import { round2 } from "../resico";

const FACTOR_PIRAMIDACION = 1.4286;

export interface CalcIsrDividendosInput {
  /** Dividendo bruto decretado a la PF (MXN). */
  dividendoBruto: number;
  /** ¿Las utilidades repartidas provienen de la CUFIN? */
  vieneDeCufin: boolean;
}

export interface CalcIsrDividendosOk {
  ok: true;
  dividendoBruto: number;
  /** Retención 10% Art. 140-V LISR — pago definitivo del accionista PF. */
  retencion10Accionista: number;
  /** ISR corporativo Art. 10 LISR (paga la PM, sólo si NO viene de CUFIN). */
  isrCorporativoPM: number;
  /** Base piramidada usada para Art. 10 (= bruto × 1.4286, o 0 si CUFIN). */
  baseAcumulableArt10: number;
  /** Lo que la PF efectivamente recibe en su cuenta. */
  dividendoNetoEnBolsillo: number;
  /** Costo TOTAL fiscal del reparto (PM + accionista). */
  costoFiscalTotal: number;
  breakdown: string[];
}

export type CalcIsrDividendosResult =
  | CalcIsrDividendosOk
  | { ok: false; error: string };

export function calcIsrDividendos(
  input: CalcIsrDividendosInput,
): CalcIsrDividendosResult {
  const bruto = Number(input.dividendoBruto);
  if (!Number.isFinite(bruto) || bruto < 0) {
    return { ok: false, error: "dividendoBruto debe ser >= 0" };
  }
  if (typeof input.vieneDeCufin !== "boolean") {
    return { ok: false, error: "vieneDeCufin debe ser boolean" };
  }

  const retencion = round2(bruto * 0.10);
  const baseAcumulable = input.vieneDeCufin ? 0 : round2(bruto * FACTOR_PIRAMIDACION);
  const isrCorp = input.vieneDeCufin ? 0 : round2(baseAcumulable * 0.30);
  const bolsillo = round2(bruto - retencion);
  const costoTotal = round2(retencion + isrCorp);

  const $ = (n: number) =>
    "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const breakdown: string[] = [
    `Dividendo bruto decretado: ${$(bruto)}`,
    input.vieneDeCufin
      ? `Proviene de CUFIN → NO causa ISR corporativo (Art. 10 LISR)`
      : `NO proviene de CUFIN → la PM paga ISR corporativo`,
    input.vieneDeCufin
      ? ""
      : `Piramidación: ${$(bruto)} × 1.4286 = ${$(baseAcumulable)} (Art. 10 LISR)`,
    input.vieneDeCufin
      ? ""
      : `ISR corporativo PM (30%): ${$(isrCorp)}`,
    `Retención 10% al accionista PF (Art. 140-V LISR, pago definitivo): ${$(retencion)}`,
    `Dividendo NETO en bolsillo del accionista: ${$(bolsillo)}`,
    `Costo fiscal TOTAL del reparto: ${$(costoTotal)}`,
  ].filter((s) => s.length > 0);

  return {
    ok: true,
    dividendoBruto: round2(bruto),
    retencion10Accionista: retencion,
    isrCorporativoPM: isrCorp,
    baseAcumulableArt10: baseAcumulable,
    dividendoNetoEnBolsillo: bolsillo,
    costoFiscalTotal: costoTotal,
    breakdown,
  };
}
