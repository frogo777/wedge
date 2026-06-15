/**
 * ISR e IVA del Régimen de Arrendamiento de Inmuebles.
 *
 * Implementa Arts. 114-118 LISR (Capítulo III — Ingresos por
 * arrendamiento) y Art. 1-A frac. II LIVA (retención del 10/16
 * de IVA por personas morales).
 *
 * Reglas clave:
 *  - Base gravable mensual = renta cobrada − deducciones autorizadas.
 *  - Deducciones autorizadas (Art. 115 LISR): predial, mantenimiento,
 *    intereses reales por hipoteca, primas de seguro, salarios y
 *    contribuciones de seguridad social, gastos de conservación,
 *    depreciación 5% anual.
 *  - "Deducción ciega" (Art. 115 último párr.): el contribuyente PUEDE
 *    optar por deducir 35% del ingreso + el predial sin comprobar gastos.
 *    Sólo se elige UNA VEZ por ejercicio (no se puede cambiar a mitad).
 *  - ISR mensual sobre la base se calcula con la tabla del Art. 96
 *    LISR (la misma de Honorarios) — el régimen no tiene tabla propia.
 *  - IVA: el arrendamiento de casa habitación está EXENTO (Art. 20-II
 *    LIVA). Local comercial está gravado a 16%. Si el arrendador es PF
 *    y el arrendatario es PM, éste retiene 10/16 partes del IVA
 *    trasladado (es decir, 10.6667% sobre la renta) — Art. 1-A frac. II
 *    LIVA y Art. 3 RLIVA.
 */

import { calcHonorariosISR } from "../honorarios";
import { round2 } from "../resico";
import { IVA_RATE } from "./constants";

export type ArrendamientoUso = "habitacional" | "comercial";

export interface CalcIsrArrendamientoInput {
  /** Renta mensual cobrada (sin IVA), en MXN. */
  rentaMensual: number;
  /** Uso del inmueble: habitacional (IVA exento) o comercial (IVA 16%). */
  uso: ArrendamientoUso;
  /** El arrendatario es Persona Moral → retiene 10/16 partes del IVA. */
  arrendatarioEsPersonaMoral?: boolean;
  /** Optar por la deducción ciega 35% (Art. 115 último párr.). */
  opcionCiega?: boolean;
  /** Gastos comprobables del mes (sólo si NO se usa la opción ciega). */
  deduccionesReales?: {
    predial?: number;
    mantenimiento?: number;
    intereses?: number;
    seguros?: number;
    otros?: number;
  };
  /**
   * Predial mensual del mes. Cuando se opta por la ciega, el predial
   * se SUMA a la deducción del 35% (no se pierde) — Art. 115 LISR.
   */
  predialMensual?: number;
  /**
   * Periodo `YYYY-MM` del cálculo — selecciona la tarifa Art. 96 LISR del
   * año correspondiente. Si se omite usa la más reciente (riesgoso para
   * cálculos retroactivos: 2025 vs 2026 difieren ~13% en límites).
   */
  periodo?: string;
  /**
   * Tasa IVA aplicable. Default 0.16 (general). Pasa 0.08 si el
   * contribuyente está inscrito en el estímulo Región Fronteriza
   * Norte/Sur (Decreto DOF 31-dic-2025, vigente 2026).
   */
  ivaRate?: number;
}

export interface CalcIsrArrendamientoOk {
  ok: true;
  baseGravable: number;
  deduccionAplicada: number;
  metodoDeduccion: "ciega_35" | "real";
  isrBruto: number;
  isrPorcentaje: number;
  ivaCausado: number;
  ivaRetenido: number;
  ivaNetoTrasladado: number;
  totalCobrarInquilino: number;
  breakdown: string[];
}

export type CalcIsrArrendamientoResult =
  | CalcIsrArrendamientoOk
  | { ok: false; error: string };

function sumDeducciones(d?: CalcIsrArrendamientoInput["deduccionesReales"]): number {
  if (!d) return 0;
  return (
    Math.max(0, d.predial || 0) +
    Math.max(0, d.mantenimiento || 0) +
    Math.max(0, d.intereses || 0) +
    Math.max(0, d.seguros || 0) +
    Math.max(0, d.otros || 0)
  );
}

export function calcIsrArrendamiento(
  input: CalcIsrArrendamientoInput,
): CalcIsrArrendamientoResult {
  const renta = Number(input.rentaMensual);
  if (!Number.isFinite(renta) || renta < 0) {
    return { ok: false, error: "rentaMensual debe ser un número >= 0" };
  }
  if (input.uso !== "habitacional" && input.uso !== "comercial") {
    return { ok: false, error: "uso debe ser 'habitacional' o 'comercial'" };
  }

  const predial = Math.max(0, Number(input.predialMensual || 0));

  let deduccion: number;
  let metodo: "ciega_35" | "real";
  if (input.opcionCiega) {
    // Ciega: 35% del ingreso + predial efectivamente pagado.
    deduccion = round2(renta * 0.35 + predial);
    metodo = "ciega_35";
  } else {
    deduccion = round2(sumDeducciones(input.deduccionesReales));
    metodo = "real";
  }

  const base = Math.max(0, round2(renta - deduccion));
  const isr = calcHonorariosISR({
    ingresosCobrados: base,
    gastosDeducibles: 0,
    periodo: input.periodo,
  });

  // IVA: habitacional exento; comercial 16% (8% en frontera).
  // La retención (Art. 1-A frac. II LIVA) son 10/16 partes del IVA
  // trasladado, generaliza correctamente: 10% al 16%, 5% al 8%.
  const ivaRate = typeof input.ivaRate === "number" && input.ivaRate >= 0
    ? input.ivaRate
    : IVA_RATE;
  let ivaCausado = 0;
  let ivaRetenido = 0;
  if (input.uso === "comercial") {
    ivaCausado = round2(renta * ivaRate);
    if (input.arrendatarioEsPersonaMoral) {
      ivaRetenido = round2(renta * (10 / 16) * ivaRate);
    }
  }
  const ivaNetoTrasladado = round2(ivaCausado - ivaRetenido);
  const totalCobrarInquilino = round2(renta + ivaCausado - ivaRetenido);

  const $ = (n: number) =>
    "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (r: number) => (r * 100).toFixed(2) + "%";

  const breakdown: string[] = [
    `Renta mensual cobrada: ${$(renta)}`,
    metodo === "ciega_35"
      ? `Deducción ciega 35% + predial: ${$(deduccion)} (Art. 115 último párr. LISR)`
      : `Deducciones reales comprobadas: ${$(deduccion)} (Art. 115 LISR)`,
    `Base gravable: ${$(base)}`,
    `Tabla Art. 96 LISR: tasa marginal ${pct(isr.porcentaje)}`,
    `ISR mensual a pagar: ${$(isr.isr)}`,
    input.uso === "habitacional"
      ? `IVA: EXENTO (Art. 20-II LIVA — casa habitación)`
      : `IVA causado 16%: ${$(ivaCausado)}`,
    input.uso === "comercial" && input.arrendatarioEsPersonaMoral
      ? `IVA retenido 10/16 (Art. 1-A frac. II LIVA): ${$(ivaRetenido)}`
      : `IVA retenido: ${$(0)}`,
    `Total a cobrar al inquilino: ${$(totalCobrarInquilino)}`,
  ];

  return {
    ok: true,
    baseGravable: base,
    deduccionAplicada: deduccion,
    metodoDeduccion: metodo,
    isrBruto: isr.isr,
    isrPorcentaje: isr.porcentaje,
    ivaCausado,
    ivaRetenido,
    ivaNetoTrasladado,
    totalCobrarInquilino,
    breakdown,
  };
}
