/**
 * ISR sobre pagos por separación (indemnización, prima de antigüedad,
 * compensaciones por retiro).
 *
 * Implementa Art. 93 frac. XIII LISR (parte exenta) y Art. 95 LISR
 * (cálculo de la parte gravable mediante el "impuesto promedio").
 *
 * Mecánica:
 *   1. EXENCIÓN — Art. 93 frac. XIII LISR:
 *        90 UMAs (anuales 2025 = $113.14 × 90 = $10,182.60... ESPERA:
 *        el texto correcto es "90 veces el SMG / UMA del área geográfica
 *        elevado al año, por cada año de servicio". La interpretación
 *        práctica vigente (criterio SAT y RMF):
 *           exención = 90 × UMA_diaria × años_servicio
 *        Las fracciones de año mayores a 6 meses se cuentan como año
 *        completo (criterio SAT 46/ISR/N).
 *
 *   2. GRAVABLE = pago total − exención.
 *
 *   3. ISR sobre la parte gravable se calcula con el procedimiento del
 *      Art. 95 LISR ("impuesto promedio"):
 *        a) Del gravable se separa el último sueldo MENSUAL ordinario
 *           ("ingreso ordinario"). Se calcula el ISR de ese sueldo
 *           con la tabla del Art. 96 LISR → ISR_ordinario.
 *        b) tasaPromedio = ISR_ordinario / sueldo_ordinario.
 *        c) ISR_separación = gravable × tasaPromedio.
 *
 * NOTA conservadora: Esta calculadora calcula la EXENCIÓN y el monto
 * gravable, y aplica el procedimiento del Art. 95. La prima de
 * antigüedad y la indemnización constitucional se suman al pago total
 * para efectos de la exención (la Ley no las trata por separado para
 * la mecánica del Art. 95).
 *
 * TODO (citation): el "criterio SAT 46/ISR/N" sobre fracciones >6 meses
 * se mantiene como interpretación práctica; algunas resoluciones del
 * TFJA lo han matizado. Para casos litigiosos consultar contador.
 */

import { calcHonorariosISR } from "../honorarios";
import { round2 } from "../resico";
import { getCurrentUMA, getUMAForDate } from "./constants";

export interface CalcIndemnizacionInput {
  /** Salario diario integrado del empleado (Art. 84 LFT). */
  salarioDiario: number;
  /** Antigüedad en años (puede ser decimal: 5.7 = 5 años 8 meses). */
  antiguedadAnios: number;
  /** Monto bruto de indemnización constitucional (3 meses + 20 días/año). */
  montoIndemnizacion: number;
  /** Prima de antigüedad pagada (12 días por año de servicio, Art. 162 LFT). */
  primaAntiguedad?: number;
  /** Otros pagos por separación (gratificación, bono retiro, etc.). */
  otrosPagosSeparacion?: number;
  /**
   * Último salario MENSUAL ordinario percibido (sueldo gravable mensual
   * con que el patrón calculaba ISR antes de la separación). Si se omite,
   * se usa salarioDiario × 30.4.
   */
  ultimoSueldoMensualOrdinario?: number;
  /** Override de UMA diaria (para tests con valor histórico). Toma
   *  precedencia sobre `fechaSeparacion`. */
  umaDiaria?: number;
  /** Fecha del pago / separación (`YYYY-MM-DD`). Selecciona la UMA
   *  vigente en ese momento. Si se omite, usa la UMA "actual" del
   *  servidor — riesgoso para cálculos retroactivos. */
  fechaSeparacion?: string;
}

export interface CalcIndemnizacionOk {
  ok: true;
  pagoTotal: number;
  aniosServicioRedondeados: number;
  parteExenta: number;
  parteGravable: number;
  sueldoOrdinario: number;
  isrOrdinario: number;
  tasaPromedio: number;        // 0..1
  isrAretener: number;
  netoEntregado: number;
  breakdown: string[];
}

export type CalcIndemnizacionResult =
  | CalcIndemnizacionOk
  | { ok: false; error: string };

/** Redondea años conforme al criterio: fracción > 6 meses cuenta como año. */
function aniosRedondeados(decimal: number): number {
  if (decimal < 0) return 0;
  const enteros = Math.floor(decimal);
  const fraccion = decimal - enteros;
  return fraccion > 0.5 ? enteros + 1 : enteros;
}

export function calcIsrIndemnizacion(
  input: CalcIndemnizacionInput,
): CalcIndemnizacionResult {
  const sd = Number(input.salarioDiario);
  const ant = Number(input.antiguedadAnios);
  const indem = Number(input.montoIndemnizacion);
  const prima = Number(input.primaAntiguedad || 0);
  const otros = Number(input.otrosPagosSeparacion || 0);
  const uma = Number(
    input.umaDiaria
      || (input.fechaSeparacion ? getUMAForDate(input.fechaSeparacion).diaria : getCurrentUMA().diaria),
  );

  if (!Number.isFinite(sd) || sd < 0)
    return { ok: false, error: "salarioDiario debe ser >= 0" };
  if (!Number.isFinite(ant) || ant < 0)
    return { ok: false, error: "antiguedadAnios debe ser >= 0" };
  if (!Number.isFinite(indem) || indem < 0)
    return { ok: false, error: "montoIndemnizacion debe ser >= 0" };
  if (!Number.isFinite(prima) || prima < 0)
    return { ok: false, error: "primaAntiguedad debe ser >= 0" };
  if (!Number.isFinite(otros) || otros < 0)
    return { ok: false, error: "otrosPagosSeparacion debe ser >= 0" };
  if (!Number.isFinite(uma) || uma <= 0)
    return { ok: false, error: "umaDiaria inválida" };

  const aniosR = aniosRedondeados(ant);
  const pagoTotal = round2(indem + prima + otros);

  // Exención Art. 93 frac. XIII: 90 UMAs diarias × años de servicio.
  const exencion = round2(Math.min(pagoTotal, 90 * uma * aniosR));
  const gravable = round2(Math.max(0, pagoTotal - exencion));

  // Art. 95: tasa promedio del último sueldo mensual ordinario.
  const sueldoOrd = Number.isFinite(input.ultimoSueldoMensualOrdinario)
    ? Math.max(0, input.ultimoSueldoMensualOrdinario as number)
    : round2(sd * 30.4);

  let isrOrdinario = 0;
  let tasaProm = 0;
  if (sueldoOrd > 0) {
    const r = calcHonorariosISR({
      ingresosCobrados: sueldoOrd,
      gastosDeducibles: 0,
      periodo: input.fechaSeparacion?.slice(0, 7),
    });
    isrOrdinario = r.isr;
    tasaProm = isrOrdinario / sueldoOrd;
  }

  const isrAretener = round2(gravable * tasaProm);
  const neto = round2(pagoTotal - isrAretener);

  const $ = (n: number) =>
    "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (r: number) => (r * 100).toFixed(2) + "%";

  const breakdown: string[] = [
    `Salario diario integrado: ${$(sd)}`,
    `Antigüedad: ${ant.toFixed(2)} años → ${aniosR} años computables (criterio SAT 46/ISR/N)`,
    `Indemnización constitucional: ${$(indem)}`,
    `Prima de antigüedad: ${$(prima)}`,
    `Otros pagos por separación: ${$(otros)}`,
    `Pago total: ${$(pagoTotal)}`,
    `Exención Art. 93-XIII LISR: 90 UMAs × ${aniosR} años = ${$(exencion)}`,
    `Parte gravable: ${$(gravable)}`,
    `Sueldo ordinario base Art. 95: ${$(sueldoOrd)}`,
    `ISR del sueldo ordinario (tabla Art. 96): ${$(isrOrdinario)}`,
    `Tasa promedio: ${pct(tasaProm)}`,
    `ISR a retener (Art. 95 LISR): ${$(isrAretener)}`,
    `Neto entregado al trabajador: ${$(neto)}`,
  ];

  return {
    ok: true,
    pagoTotal,
    aniosServicioRedondeados: aniosR,
    parteExenta: exencion,
    parteGravable: gravable,
    sueldoOrdinario: sueldoOrd,
    isrOrdinario: round2(isrOrdinario),
    tasaPromedio: Math.round(tasaProm * 1e6) / 1e6,
    isrAretener,
    netoEntregado: neto,
    breakdown,
  };
}
