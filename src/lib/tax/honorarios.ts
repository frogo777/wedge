/**
 * Régimen "Actividad Empresarial y Profesional" / Honorarios.
 *
 * Pure tax math. Cash basis (efectivamente cobrado / pagado), same as
 * RESICO, but with deductions and progressive ISR table.
 *
 * Sources:
 *  - LISR arts. 100-113 (Capítulo II — Régimen General)
 *  - LISR art. 96 (tabla mensual ISR)
 *  - LIVA arts. 1, 1-A, 4-5
 *
 * Differences vs RESICO PF:
 *   • RESICO: tasa fija 1-2.5% sobre ingreso bruto, sin deducciones
 *   • Honorarios: progresivo 1.92-35% sobre (ingresos − gastos deducibles)
 *
 * Cuándo usar Honorarios sobre RESICO:
 *   • Margen bajo (gastos > 30% de ingresos)
 *   • Ingresos > 3.5M anuales (RESICO ya no aplica)
 *   • Importaciones, comisionistas, asociaciones civiles
 */

import { round2, sum, num } from "./resico";
import type { Transaction } from "./resico";
import { isCancelledCfdi, isVigenteCfdi, isFormaPagoDeducible } from "./validators";

/* ─── Tabla mensual ISR Honorarios (Art. 96 LISR) ────────────────── */
//
// SAT actualiza la tarifa cada año por inflación (factor INPC). Mantenemos
// las tarifas históricas y un selector year-aware para que un cálculo de
// periodo 2025-12 NO use la tabla 2026.
//
// Fuentes:
//   • RMF 2025 Anexo 8 (DOF 30-dic-2024)
//   • RMF 2026 Anexo 8 (DOF 28-dic-2025) — factor de actualización 1.1321
//     (inflación acumulada ~13.21% desde última actualización vs ene-2024).

export interface HonorariosBracket {
  limiteInferior: number;
  limiteSuperior: number;
  cuotaFija: number;
  /** Porcentaje sobre el excedente (decimal: 0.0192 = 1.92%) */
  porcentaje: number;
}

export const HONORARIOS_TABLE_2025: ReadonlyArray<HonorariosBracket> = [
  { limiteInferior:      0.01, limiteSuperior:    746.04, cuotaFija:      0.00, porcentaje: 0.0192 },
  { limiteInferior:    746.05, limiteSuperior:   6332.05, cuotaFija:     14.32, porcentaje: 0.0640 },
  { limiteInferior:   6332.06, limiteSuperior:  11128.01, cuotaFija:    371.83, porcentaje: 0.1088 },
  { limiteInferior:  11128.02, limiteSuperior:  12935.82, cuotaFija:    893.63, porcentaje: 0.1600 },
  { limiteInferior:  12935.83, limiteSuperior:  15487.71, cuotaFija:   1182.88, porcentaje: 0.1792 },
  { limiteInferior:  15487.72, limiteSuperior:  31236.49, cuotaFija:   1640.18, porcentaje: 0.2136 },
  { limiteInferior:  31236.50, limiteSuperior:  49233.00, cuotaFija:   5004.12, porcentaje: 0.2352 },
  { limiteInferior:  49233.01, limiteSuperior:  93993.90, cuotaFija:   9236.89, porcentaje: 0.3000 },
  { limiteInferior:  93993.91, limiteSuperior: 125325.20, cuotaFija:  22665.17, porcentaje: 0.3200 },
  { limiteInferior: 125325.21, limiteSuperior: 375975.61, cuotaFija:  32691.18, porcentaje: 0.3400 },
  { limiteInferior: 375975.62, limiteSuperior: Infinity,  cuotaFija: 117912.32, porcentaje: 0.3500 },
];

export const HONORARIOS_TABLE_2026: ReadonlyArray<HonorariosBracket> = [
  { limiteInferior:      0.01, limiteSuperior:    844.59, cuotaFija:      0.00, porcentaje: 0.0192 },
  { limiteInferior:    844.60, limiteSuperior:   7168.51, cuotaFija:     16.22, porcentaje: 0.0640 },
  { limiteInferior:   7168.52, limiteSuperior:  12598.02, cuotaFija:    420.95, porcentaje: 0.1088 },
  { limiteInferior:  12598.03, limiteSuperior:  14644.64, cuotaFija:   1011.68, porcentaje: 0.1600 },
  { limiteInferior:  14644.65, limiteSuperior:  17533.64, cuotaFija:   1339.14, porcentaje: 0.1792 },
  { limiteInferior:  17533.65, limiteSuperior:  35362.83, cuotaFija:   1856.84, porcentaje: 0.2136 },
  { limiteInferior:  35362.84, limiteSuperior:  55736.68, cuotaFija:   5665.16, porcentaje: 0.2352 },
  { limiteInferior:  55736.69, limiteSuperior: 106410.50, cuotaFija:  10457.09, porcentaje: 0.3000 },
  { limiteInferior: 106410.51, limiteSuperior: 141880.66, cuotaFija:  25659.23, porcentaje: 0.3200 },
  { limiteInferior: 141880.67, limiteSuperior: 425641.99, cuotaFija:  37009.69, porcentaje: 0.3400 },
  { limiteInferior: 425642.00, limiteSuperior: Infinity,  cuotaFija: 133488.54, porcentaje: 0.3500 },
];

const HONORARIOS_BY_YEAR: Record<number, ReadonlyArray<HonorariosBracket>> = {
  2025: HONORARIOS_TABLE_2025,
  2026: HONORARIOS_TABLE_2026,
};

/** Devuelve la tarifa Art. 96 LISR vigente para un periodo `YYYY-MM`.
 *  Si el año no está cargado, cae al más reciente conocido (fail-soft)
 *  y loggea warning para que el founder lo arregle.
 *
 *  PARA AGREGAR UN AÑO NUEVO (ej. 2027):
 *  1. SAT publica nueva tabla mensual en DOF (típicamente 28-30 diciembre)
 *  2. Agregar `HONORARIOS_TABLE_2027` arriba con los nuevos brackets
 *  3. Sumar entrada en `HONORARIOS_BY_YEAR`: `2027: HONORARIOS_TABLE_2027`
 *  4. Ver también `src/lib/tax/calculators/constants.ts` para UMA_2027
 *  5. Correr tests: `npm test`
 *  Doc completo: `docs/UPDATE-ANO-FISCAL.md`
 */
export function getHonorariosTable(periodo: string): ReadonlyArray<HonorariosBracket> {
  const year = parseInt((periodo || "").slice(0, 4), 10);
  if (Number.isFinite(year) && HONORARIOS_BY_YEAR[year]) return HONORARIOS_BY_YEAR[year];
  const known = Object.keys(HONORARIOS_BY_YEAR).map(Number);
  const latestYear = Math.max(...known);
  // Warning solo si el año pedido es POSTERIOR al conocido (no si es histórico).
  if (Number.isFinite(year) && year > latestYear && typeof console !== "undefined") {
    console.warn(
      `[wedge tax] No hay tabla Honorarios para ${year}. Usando ${latestYear} como fallback. ` +
      `Actualizar src/lib/tax/honorarios.ts con HONORARIOS_TABLE_${year}.`
    );
  }
  return HONORARIOS_BY_YEAR[latestYear];
}

/** @deprecated — usa `getHonorariosTable(periodo)` en lugar de la tabla
 *  global, para que cálculos de periodos pasados no usen brackets nuevos.
 *  Apunta a la tabla más reciente (2026). */
export const HONORARIOS_TABLE: ReadonlyArray<HonorariosBracket> = HONORARIOS_TABLE_2026;

export interface HonorariosISRResult {
  baseGravable:  number;     // ingresosCobrados − gastosPagadosDeducibles
  cuotaFija:     number;
  excedente:     number;
  porcentaje:    number;
  isr:           number;     // ISR bruto antes de retenciones
  bracket: { limiteInferior: number; limiteSuperior: number };
}

/** Encuentra el renglón de la tabla aplicable a una base gravable.
 *  Caso especial: base = 0 (sin ingresos / gastos > ingresos) cae en el
 *  primer tramo con cuotaFija = 0 — sin esto, el loop hace fall-through al
 *  último tramo (35%) porque la tabla SAT empieza en 0.01. Bug encontrado
 *  por suite de tests honorarios. */
function findBracket(base: number, table: ReadonlyArray<HonorariosBracket>): HonorariosBracket {
  if (base <= 0) return table[0];
  for (const b of table) {
    if (base >= b.limiteInferior && base <= b.limiteSuperior) return b;
  }
  return table[table.length - 1];
}

/**
 * ISR mensual Honorarios (cash basis) sobre la base gravable
 * = ingresosCobrados − gastosDeduciblesPagados.
 *
 * Gastos deducibles: aquellos con CFDI timbrado, indispensables para
 * la actividad, pagados con medios bancarizados (transferencia, tarjeta,
 * cheque nominativo) si exceden $2,000 — Art. 27 fracc. III LISR.
 *
 * `periodo` (`YYYY-MM`) selecciona la tarifa Art. 96 vigente; si se omite
 * usa la más reciente (peligroso para cálculos retroactivos — pasa siempre
 * el periodo del cálculo).
 */
export function calcHonorariosISR(input: {
  ingresosCobrados: number;
  gastosDeducibles: number;
  periodo?: string;
}): HonorariosISRResult {
  const base = Math.max(0, input.ingresosCobrados - input.gastosDeducibles);
  const table = getHonorariosTable(input.periodo || "");
  const bracket = findBracket(base, table);
  const excedente = round2(Math.max(0, base - bracket.limiteInferior));
  const isr = round2(bracket.cuotaFija + excedente * bracket.porcentaje);
  return {
    baseGravable: round2(base),
    cuotaFija: bracket.cuotaFija,
    excedente,
    porcentaje: bracket.porcentaje,
    isr,
    bracket: { limiteInferior: bracket.limiteInferior, limiteSuperior: bracket.limiteSuperior },
  };
}

export interface HonorariosISRNetoResult extends HonorariosISRResult {
  retenido: number;
  aPagar:   number;
}

/**
 * ISR neto Honorarios = bruto − retenciones (10% que las morales retienen
 * a personas físicas con actividad profesional, Art. 106 LISR penúltimo párr.)
 */
export function calcHonorariosISRNeto(input: {
  ingresosCobrados: number;
  gastosDeducibles: number;
  retencionesISR:   number;
  periodo?:         string;
}): HonorariosISRNetoResult {
  // Mantenido para retrocompatibilidad. Cálculo "flat" mes a mes.
  // Para resultados precisos (Art. 14 LISR), usa `calcHonorariosISRAcumulado()`
  // que aplica la tabla con bases acumuladas. Esta función queda solo para
  // tools que no tienen YTD context disponible.
  const r = calcHonorariosISR(input);
  const retenido = Math.max(0, input.retencionesISR || 0);
  const aPagar = Math.max(0, round2(r.isr - retenido));
  return { ...r, retenido: round2(retenido), aPagar };
}

/* ─── Acumulativo (Art. 14 LISR) — el correcto fiscalmente ────────── */

export interface MonthlyTotal {
  /** "YYYY-MM" */
  periodo: string;
  ingresosCobrados: number;
  gastosDeducibles: number;
  retencionesISR: number;
  /** ISR provisional pagado por wedge previamente para ese mes (si lo conoce) */
  pagoProvisionalPagado?: number;
}

export interface HonorariosAcumuladoResult {
  /** Mes que se está calculando — "YYYY-MM" */
  periodo: string;
  /** Mes ordinal del año, 1-12 */
  numeroMes: number;
  /** Ingresos cobrados acumulados enero-mes actual */
  ingresosAcumulados: number;
  /** Gastos deducibles acumulados enero-mes actual */
  gastosAcumulados: number;
  /** Base gravable acumulada (ingresos - gastos, mínimo 0) */
  baseAcumulada: number;
  /** Tabla aplicada (tarifa ANUALIZADA = mensual × numeroMes) */
  tablaAplicada: HonorariosBracket;
  /** ISR acumulado YTD según base × tabla anualizada */
  isrAcumulado: number;
  /** ISR retenido acumulado YTD por terceros (clientes morales) */
  isrRetenidoAcumulado: number;
  /** ISR provisionales pagados en meses anteriores */
  pagosProvisionalesAnteriores: number;
  /** ISR a pagar ESTE mes = isrAcumulado - retenido - provisionales anteriores */
  isrEsteMes: number;
}

/**
 * Cálculo correcto de ISR provisional Honorarios (Art. 14 LISR).
 *
 * Procedimiento oficial SAT:
 *   1. Suma ingresos cobrados de enero al mes actual.
 *   2. Resta gastos deducibles del mismo periodo. Resultado = base acumulada.
 *   3. Aplica la tarifa Art. 96 LISR PERO con cada bracket multiplicado por
 *      el número de meses transcurridos. Ej: para mayo (mes 5), todos los
 *      límiteInferior, límiteSuperior y cuotaFija se multiplican × 5.
 *   4. ISR acumulado = cuotaFijaAcumulada + (excedente × tasaBracket).
 *   5. Resta ISR retenido acumulado (clientes morales que retuvieron 10%).
 *   6. Resta pagos provisionales pagados en meses anteriores.
 *   7. Lo que queda es lo que pagas ESTE mes.
 *
 * Si el resultado es negativo, hay saldo a favor — NO se devuelve, se
 * acumula al mes siguiente (no hay refund mensual en provisionales).
 */
export function calcHonorariosISRAcumulado(input: {
  /** Histórico de TODOS los meses del año (enero al actual). Debe incluir
   *  el mes que se está calculando. Idealmente vienen ordenados por periodo
   *  pero la función tolera desorden. */
  monthlyTotals: MonthlyTotal[];
  /** El periodo a calcular — "YYYY-MM". Si no, usa el mes más reciente del
   *  array. */
  periodo: string;
}): HonorariosAcumuladoResult {
  const periodo = input.periodo;
  const [yearStr, monthStr] = periodo.split("-");
  const year = parseInt(yearStr, 10);
  const numeroMes = parseInt(monthStr, 10);

  if (!Number.isFinite(year) || !Number.isFinite(numeroMes) || numeroMes < 1 || numeroMes > 12) {
    throw new Error(`periodo inválido: ${periodo}`);
  }

  // Filtrar meses del año en curso, hasta el mes actual inclusive.
  const mesesYTD = input.monthlyTotals.filter((m) => {
    const [y, mo] = m.periodo.split("-").map(Number);
    return y === year && mo >= 1 && mo <= numeroMes;
  });

  // Acumular
  let ingresosAcum = 0;
  let gastosAcum = 0;
  let retencionesAcum = 0;
  let pagosAnteriores = 0;
  for (const m of mesesYTD) {
    ingresosAcum += m.ingresosCobrados ?? 0;
    gastosAcum += m.gastosDeducibles ?? 0;
    retencionesAcum += m.retencionesISR ?? 0;
    // Solo cuentan los pagos de meses ANTERIORES al periodo a calcular.
    const mNum = parseInt((m.periodo.split("-")[1] || "0"), 10);
    if (mNum < numeroMes) pagosAnteriores += m.pagoProvisionalPagado ?? 0;
  }

  const baseAcum = Math.max(0, round2(ingresosAcum - gastosAcum));

  // Tabla anualizada: multiplica límites y cuotaFija por numeroMes.
  // La tasa porcentaje NO se multiplica (es un %, no un absoluto).
  const tablaMensual = getHonorariosTable(periodo);
  const tablaAcum: ReadonlyArray<HonorariosBracket> = tablaMensual.map((b) => ({
    limiteInferior: round2(b.limiteInferior * numeroMes),
    limiteSuperior: b.limiteSuperior === Infinity ? Infinity : round2(b.limiteSuperior * numeroMes),
    cuotaFija: round2(b.cuotaFija * numeroMes),
    porcentaje: b.porcentaje,
  }));

  const bracket = findBracket(baseAcum, tablaAcum);
  const excedente = round2(Math.max(0, baseAcum - bracket.limiteInferior));
  const isrAcum = round2(bracket.cuotaFija + excedente * bracket.porcentaje);

  // Lo que toca pagar este mes
  const isrEsteMes = Math.max(0, round2(isrAcum - retencionesAcum - pagosAnteriores));

  return {
    periodo,
    numeroMes,
    ingresosAcumulados: round2(ingresosAcum),
    gastosAcumulados: round2(gastosAcum),
    baseAcumulada: baseAcum,
    tablaAplicada: bracket,
    isrAcumulado: isrAcum,
    isrRetenidoAcumulado: round2(retencionesAcum),
    pagosProvisionalesAnteriores: round2(pagosAnteriores),
    isrEsteMes,
  };
}

/* ─── Declaración mensual completa para Honorarios ──────────────────── */

export interface HonorariosDeclaration {
  periodo:           string;
  ingresosCobrados:  number;
  gastosPagados:     number;
  gastosDeducibles:  number;          // subset de gastos pagados con CFDI + es_deducible
  baseGravable:      number;
  ivaTrasladado:     number;
  ivaAcreditable:    number;
  ivaRetenido:       number;
  isrRetenido:       number;
  isr: {
    bruto:      number;
    porcentaje: number;
    aPagar:     number;
  };
  iva: {
    saldoAFavor: number;
    aPagar:      number;
    neto:        number;
  };
  totalAPagar:       number;
  breakdown:         string[];
}

export function buildHonorariosDeclaration(
  txs: Transaction[],
  periodo: string,
  /** Pagos provisionales pagados en meses anteriores del MISMO año (Art. 14
   *  LISR exige restar pagos provisionales acumulados). Map "YYYY-MM" → monto.
   *  Si vacío/missing, asumimos 0 (caso típico: primer mes del año, o user
   *  apenas conecta wedge en mid-year y no tiene historial). */
  pagosProvisionalesPrevios?: Record<string, number>,
): HonorariosDeclaration {
  // Same cancellation-exclusion as RESICO. Cancelled CFDIs never happened
  // for tax purposes (Art. 29-A CFF — el receptor puede oponerse, y si SAT
  // valida la cancelación, ese CFDI sale del cálculo).
  // También excluimos REPs (cfdi_tipo="P") — no son ingreso nuevo, son
  // cobro de PPD anteriores. Ver resico.ts para más contexto.
  const mesTxs = txs.filter((tx) =>
    (tx.date || "").slice(0, 7) === periodo
    && !isCancelledCfdi(tx)
    && tx.cfdi_tipo !== "P",
  );
  const ingresos = mesTxs.filter((tx) => tx.type === "in" && tx.efectivamente_cobrado !== false);
  // Cash basis Art. 105 LISR y Art. 5 LIVA: gastos solo se reconocen
  // cuando están PAGADOS. Una factura recibida pero no pagada no acredita
  // IVA ni deduce ISR.
  const egresos = mesTxs.filter((tx) => tx.type === "out" && tx.efectivamente_cobrado !== false);
  const egresosDeducibles = egresos.filter(
    // BUG FIX (auditor Honorarios P0-1): Art. 27 fracc. III LISR — gastos
    // > $2,000 SOLO deducibles si pagados con medio bancarizado. Antes
    // wedge deducía efectivo > $2K → SAT rechaza en revisión.
    (tx) => tx.es_deducible !== false && isVigenteCfdi(tx) && isFormaPagoDeducible(tx),
  );

  const ingresosCobrados = sum(ingresos.map((tx) => num(tx.amount)));
  const gastosPagados    = sum(egresos.map((tx) => num(tx.amount)));
  const gastosDeducibles = sum(egresosDeducibles.map((tx) => num(tx.amount)));

  const ivaTrasladado  = sum(ingresos.map((tx) => num(tx.iva)));
  const ivaAcreditable = sum(egresosDeducibles.map((tx) => num(tx.iva)));
  const ivaRetenido    = sum(ingresos.map((tx) => num(tx.iva_retenido)));
  const isrRetenido    = sum(ingresos.map((tx) => num(tx.isr_retenido)));

  /* ── ISR ACUMULATIVO (Art. 14 LISR) ───────────────────────────
     Si tenemos `txs` con datos de meses anteriores del mismo año,
     calculamos correctamente con base acumulada. Si no, fallback a
     monthly-flat (calcHonorariosISRNeto) — menos preciso pero útil
     cuando el user apenas conecta wedge sin historial. */
  const [yearStr] = periodo.split("-");
  const year = parseInt(yearStr, 10);
  const ytdTxs = txs.filter((tx) => {
    const txPeriodo = (tx.date || "").slice(0, 7);
    if (!txPeriodo.startsWith(yearStr)) return false;
    if (txPeriodo > periodo) return false;     // futuro = excluir
    if (isCancelledCfdi(tx)) return false;
    if (tx.cfdi_tipo === "P") return false;
    return true;
  });

  // Agrupar YTD por mes para construir MonthlyTotals
  const monthlyTotalsMap = new Map<string, MonthlyTotal>();
  for (const tx of ytdTxs) {
    const p = (tx.date || "").slice(0, 7);
    const acc = monthlyTotalsMap.get(p) ?? {
      periodo: p, ingresosCobrados: 0, gastosDeducibles: 0,
      retencionesISR: 0, pagoProvisionalPagado: 0,
    };
    if (tx.type === "in" && tx.efectivamente_cobrado !== false) {
      acc.ingresosCobrados += num(tx.amount);
      acc.retencionesISR = (acc.retencionesISR ?? 0) + num(tx.isr_retenido);
    } else if (tx.type === "out" && tx.efectivamente_cobrado !== false
               && tx.es_deducible !== false && isVigenteCfdi(tx)
               && isFormaPagoDeducible(tx)) {
      acc.gastosDeducibles += num(tx.amount);
    }
    monthlyTotalsMap.set(p, acc);
  }
  // Inyectar pagos provisionales previos pasados por el caller
  if (pagosProvisionalesPrevios) {
    for (const [p, monto] of Object.entries(pagosProvisionalesPrevios)) {
      const acc = monthlyTotalsMap.get(p) ?? {
        periodo: p, ingresosCobrados: 0, gastosDeducibles: 0,
        retencionesISR: 0, pagoProvisionalPagado: 0,
      };
      acc.pagoProvisionalPagado = monto;
      monthlyTotalsMap.set(p, acc);
    }
  }

  // Decisión: usar acumulado solo si tenemos al menos 1 mes anterior con data.
  // Si solo tenemos el mes actual, el acumulado degenera al monthly y el
  // resultado coincide con flat — pero usamos el código moderno por consistencia.
  const useAcumulado = Number.isFinite(year) && monthlyTotalsMap.size > 0;

  let isrCalc: HonorariosISRNetoResult;
  if (useAcumulado) {
    const acum = calcHonorariosISRAcumulado({
      monthlyTotals: Array.from(monthlyTotalsMap.values()),
      periodo,
    });
    // Adapta el resultado acumulado al shape `HonorariosISRNetoResult` que
    // el rest of this function espera. ISR bruto del MES = isrAcumulado total
    // (lo que el SAT reconoce como ISR del año hasta este mes). ISR a pagar
    // = isrEsteMes (después de retenciones y provisionales anteriores).
    isrCalc = {
      baseGravable: acum.baseAcumulada,
      cuotaFija: acum.tablaAplicada.cuotaFija,
      excedente: round2(Math.max(0, acum.baseAcumulada - acum.tablaAplicada.limiteInferior)),
      porcentaje: acum.tablaAplicada.porcentaje,
      isr: acum.isrAcumulado,
      bracket: { limiteInferior: acum.tablaAplicada.limiteInferior, limiteSuperior: acum.tablaAplicada.limiteSuperior },
      retenido: acum.isrRetenidoAcumulado,
      aPagar: acum.isrEsteMes,
    };
  } else {
    isrCalc = calcHonorariosISRNeto({
      ingresosCobrados,
      gastosDeducibles,
      retencionesISR: isrRetenido,
      periodo,
    });
  }

  // Reuse RESICO's IVA math — same logic for Honorarios.
  const ivaNeto = round2(ivaTrasladado - ivaAcreditable - ivaRetenido);
  const iva = ivaNeto > 0
    ? { saldoAFavor: 0, aPagar: ivaNeto, neto: ivaNeto }
    : { saldoAFavor: round2(-ivaNeto), aPagar: 0, neto: ivaNeto };

  const totalAPagar = round2(isrCalc.aPagar + Math.max(iva.aPagar, 0));

  const $ = (n: number) => "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (r: number) => (r * 100).toFixed(2) + "%";

  const breakdown: string[] = [
    `Periodo: ${periodo}`,
    `Ingresos efectivamente cobrados: ${$(ingresosCobrados)}`,
    `Gastos pagados (todos): ${$(gastosPagados)}`,
    `Gastos deducibles (con CFDI + indispensables): ${$(gastosDeducibles)}`,
    `Base gravable (ingresos − deducibles): ${$(isrCalc.baseGravable)}`,
    `Tabla Art. 96: tramo $${isrCalc.bracket.limiteInferior.toFixed(2)} – $${isrCalc.bracket.limiteSuperior === Infinity ? "∞" : isrCalc.bracket.limiteSuperior.toFixed(2)}`,
    `Cuota fija: ${$(isrCalc.cuotaFija)} + ${pct(isrCalc.porcentaje)} sobre excedente ${$(isrCalc.excedente)}`,
    `ISR bruto: ${$(isrCalc.isr)}`,
    `ISR retenido: ${$(isrCalc.retenido)}`,
    `ISR a pagar: ${$(isrCalc.aPagar)}`,
    `IVA trasladado (cobrado): ${$(ivaTrasladado)}`,
    `IVA acreditable (pagado en deducibles): ${$(ivaAcreditable)}`,
    `IVA retenido: ${$(ivaRetenido)}`,
    `IVA ${iva.aPagar > 0 ? "a pagar" : "saldo a favor"}: ${$(iva.aPagar > 0 ? iva.aPagar : iva.saldoAFavor)}`,
    `Total a pagar al SAT: ${$(totalAPagar)}`,
  ];

  return {
    periodo,
    ingresosCobrados: round2(ingresosCobrados),
    gastosPagados: round2(gastosPagados),
    gastosDeducibles: round2(gastosDeducibles),
    baseGravable: isrCalc.baseGravable,
    ivaTrasladado: round2(ivaTrasladado),
    ivaAcreditable: round2(ivaAcreditable),
    ivaRetenido: round2(ivaRetenido),
    isrRetenido: round2(isrRetenido),
    isr: { bruto: isrCalc.isr, porcentaje: isrCalc.porcentaje, aPagar: isrCalc.aPagar },
    iva,
    totalAPagar,
    breakdown,
  };
}
