import { isCancelledCfdi, isVigenteCfdi, isFormaPagoDeducible } from "./validators";

/**
 * RESICO PF — pure tax math.
 *
 * All functions here are side-effect free. No DB, no UI, no I/O.
 * Everything is cash basis ("efectivamente cobrado / pagado") as the
 * law requires for RESICO PF and IVA in this regime.
 *
 * Sources:
 *  - LISR arts. 113-E a 113-J (RESICO PF, vigente desde 2022)
 *  - LIVA arts. 1, 1-A, 4-5 (acreditamiento y retenciones)
 *  - RMF 2026 reglas 3.13.x
 *
 * Verificación 2026 (verificado contra Art. 113-E LISR vigente y RMF 2026):
 * los brackets RESICO PF NO se actualizan por inflación — son los mismos
 * desde 2022. La RMF 2026 sí trae cambios pero no en estos rangos:
 *   - recargos por mora: 2.07% mensual (antes 1.47%)
 *   - factor INPC para tarifas Art. 96 (Honorarios) sí se actualizó
 */

/* ─── brackets ──────────────────────────────────────────────────────── */

// Art. 113-E LISR — mensual. El último bracket termina en $3,500,000 que
// también coincide con el cap ANUAL del régimen, pero son reglas distintas:
//  - El bracket 2.5% aplica a ingresos mensuales hasta $3.5M.
//  - El cap anual ($3.5M acumulado al año) está en RESICO_LIMITE_ANUAL.
// Si alguien factura >$3.5M en UN solo mes (improbable), el cálculo cae
// al último bracket (2.5%) y el cap anual lo sacará del régimen al cierre.
export const RESICO_BRACKETS: Array<{ limit: number; rate: number }> = [
  { limit: 25000,    rate: 0.010 },
  { limit: 50000,    rate: 0.011 },
  { limit: 83333.33, rate: 0.015 },
  { limit: 208333.33, rate: 0.020 },
  { limit: 3500000,  rate: 0.025 },
];

/** Top-out rate if ingresos anuales ≤ 3.5M; beyond that the taxpayer
 *  must leave RESICO and migrate to Actividad Empresarial. We keep the
 *  2.5% here as the ceiling for consistency. */
export const RESICO_LIMITE_ANUAL = 3_500_000;

/**
 * Returns the RESICO bracket rate for a given monthly income amount.
 * Uses "<=" against bracket `limit`, so the boundary itself falls in
 * the lower bracket (25,000 MXN → 1.0%, 25,000.01 → 1.1%).
 */
export function resicoISRRate(monthlyIncome: number): number {
  const m = Math.max(0, monthlyIncome);
  for (const b of RESICO_BRACKETS) {
    if (m <= b.limit) return b.rate;
  }
  // Above the top-bracket limit: in practice this means the taxpayer has
  // exceeded the RESICO ceiling — we return the highest rate to avoid
  // silently under-reporting, but UI should surface a warning.
  return RESICO_BRACKETS[RESICO_BRACKETS.length - 1].rate;
}

/* ─── ISR ───────────────────────────────────────────────────────────── */

export interface ISRBrutoResult {
  rate:    number;
  isr:     number;
  bracket: { limit: number; rate: number };
}

/**
 * ISR bruto del mes: ingresos efectivamente cobrados × tasa del tramo.
 *
 * Resolvemos directamente al objeto bracket (no roundtrip por `rate`)
 * para evitar el patrón frágil de `RESICO_BRACKETS.find(b => rate === b.rate)`
 * — si dos brackets compartieran tasa o si `rate` viniera de aritmética
 * con drift de punto flotante, la búsqueda fallaría silenciosamente.
 */
export function calcISRBruto(ingresosCobrados: number): ISRBrutoResult {
  const base = Math.max(0, ingresosCobrados);
  const bracket = resolveResicoBracket(base);
  return {
    rate: bracket.rate,
    isr:  round2(base * bracket.rate),
    bracket,
  };
}

/** Encuentra el bracket aplicable a un monto mensual, sin pasar por rate. */
function resolveResicoBracket(monthlyIncome: number): { limit: number; rate: number } {
  const m = Math.max(0, monthlyIncome);
  for (const b of RESICO_BRACKETS) {
    if (m <= b.limit) return b;
  }
  return RESICO_BRACKETS[RESICO_BRACKETS.length - 1];
}

export interface ISRNetoResult {
  bruto:    number;
  retenido: number;
  aPagar:   number;
  /** Saldo a favor cuando retenciones > ISR bruto (Art. 22 CFF — devolución/compensación). */
  saldoAFavor: number;
}

/**
 * ISR neto del mes: bruto − retenciones ya aplicadas (morales retienen
 * 1.25% sobre ingresos RESICO; plataformas retienen su propia tasa).
 *
 * Si la retención supera al bruto el resultado es 0 — el excedente se
 * acredita contra ISR anual o se pide en devolución.
 */
export function calcISRNeto(params: {
  ingresosCobrados: number;
  retencionesISR:   number;
}): ISRNetoResult {
  const { isr: bruto } = calcISRBruto(params.ingresosCobrados);
  const retenido = Math.max(0, params.retencionesISR || 0);
  const diff = round2(bruto - retenido);
  const aPagar = Math.max(0, diff);
  // BUG FIX (auditor RESICO): cuando retenciones > ISR bruto, hay saldo a
  // favor acreditable contra ISR anual o solicitable por devolución
  // (Art. 22 CFF). Antes este excedente se descartaba con Math.max(0,...)
  // → user perdía $25-$3K/año. Ahora lo exponemos para que la UI lo muestre
  // y el módulo anual lo compense.
  const saldoAFavor = diff < 0 ? round2(-diff) : 0;
  return { bruto, retenido: round2(retenido), aPagar, saldoAFavor };
}

/* ─── IVA ───────────────────────────────────────────────────────────── */

export interface IVACalcInput {
  ivaTrasladadoCobrado: number;   // IVA cobrado en CFDI efectivamente pagados
  ivaAcreditablePagado: number;   // IVA pagado en gastos con CFDI e indispensables
  ivaRetenido?:         number;   // IVA que morales/plataformas retuvieron al contribuyente
}

export interface IVAResult {
  saldoAFavor: number;  // > 0 si acreditable + retenido > trasladado
  aPagar:      number;  // > 0 si trasladado > acreditable + retenido
  neto:        number;  // trasladado − acreditable − retenido (signo indica dirección)
}

/**
 * IVA mensual RESICO PF (cash basis).
 *
 *   neto = trasladado − acreditable − retenido
 *
 * Si neto > 0  → IVA a pagar al SAT
 * Si neto ≤ 0  → saldo a favor (acreditable contra meses siguientes
 *                o solicitable en devolución).
 */
export function calcIVA(input: IVACalcInput): IVAResult {
  const trasladado  = Math.max(0, input.ivaTrasladadoCobrado || 0);
  const acreditable = Math.max(0, input.ivaAcreditablePagado || 0);
  const retenido    = Math.max(0, input.ivaRetenido || 0);
  const neto = round2(trasladado - acreditable - retenido);
  if (neto > 0) return { saldoAFavor: 0, aPagar: neto, neto };
  return { saldoAFavor: round2(-neto), aPagar: 0, neto };
}

/* ─── Transacción — shape de la tabla `transactions` ───────────────── */

export interface Transaction {
  id:             string;
  description:    string;
  amount:         number;
  type:           "in" | "out";
  date:           string;           // YYYY-MM-DD
  category:       string | null;
  cfdi_status:    "timbrado" | "cancelado" | "sin_cfdi" | string;
  deductibility?: "100" | "50" | "no" | null;
  /** Forma de pago CFDI 4.0 (catálogo c_FormaPago SAT). 01=efectivo, 02=cheque,
   * 03=transferencia, 04=tarjeta crédito, 28=tarjeta débito. Art. 27 fracc. III
   * LISR exige medio bancarizado para deducir gastos > $2,000. */
  forma_pago?:             string | null;
  // Fiscal columns (add_fiscal_columns.sql):
  iva?:                    number | null;
  isr_retenido?:           number | null;
  iva_retenido?:           number | null;
  es_deducible?:           boolean | null;
  efectivamente_cobrado?:  boolean | null;
  /** Tipo de CFDI: I=Ingreso, E=Egreso, P=Pago (REP), N=Nómina, T=Traslado.
   *  CRÍTICO: los CFDI tipo "P" (REP) NO suman ingresos nuevos — son
   *  comprobantes de pago de PPD anteriores. Si los contamos como ingreso
   *  duplicamos el monto (audit 2026-05). */
  cfdi_tipo?:              string | null;
  /** RFC del receptor del CFDI. Usado por análisis YoY para contar clientes
   *  distintos. Puede venir null para CFDIs viejos importados antes de
   *  agregar la columna. */
  receptor_rfc?:           string | null;
}

/* ─── Declaración mensual completa ─────────────────────────────────── */

export interface MonthlyDeclaration {
  periodo:          string;           // "YYYY-MM"
  ingresosCobrados: number;
  egresosPagados:   number;
  ivaTrasladado:    number;
  ivaAcreditable:   number;
  ivaRetenido:      number;
  isrRetenido:      number;
  isr: {
    rate:   number;
    bruto:  number;
    aPagar: number;
  };
  iva: {
    saldoAFavor: number;
    aPagar:      number;
    neto:        number;
  };
  totalAPagar:      number;           // isr.aPagar + max(iva.aPagar, 0)
  breakdown:        string[];         // pasos legibles
}

/**
 * Agrupa transacciones de un mes y calcula la declaración completa.
 *
 * Convenciones:
 *  - `tx.type === "in"`  → ingreso cobrado (si `efectivamente_cobrado !== false`).
 *  - `tx.type === "out"` → egreso pagado.
 *  - `tx.iva` se suma al IVA trasladado (ingresos) o acreditable (egresos).
 *    Para egresos sólo se acredita si `es_deducible !== false` y hay CFDI
 *    timbrado (`cfdi_status === "timbrado"`), conforme al Art. 5 LIVA.
 *  - `tx.isr_retenido` y `tx.iva_retenido` sólo aplican a ingresos ("in").
 */
export function buildMonthlyDeclaration(
  txs: Transaction[],
  periodo: string,
): MonthlyDeclaration {
  // Exclude cancelled CFDIs from EVERY calculation. SAT cancels = it's as if
  // the invoice never happened — counting it would force the user to pay ISR
  // on phantom income. Caught by sync-fixtures.test.ts case #5.
  //
  // Y excluimos también CFDI tipo "P" (REP / Complemento de Pago). Estos
  // son comprobantes de cobro de facturas PPD previas — NO ingresos nuevos.
  // Si los sumamos al "in", duplicamos el ingreso (la PPD original ya cuenta
  // cuando efectivamente_cobrado=true). Audit 2026-05.
  const mesTxs = txs.filter(tx =>
    (tx.date || "").slice(0, 7) === periodo
    && !isCancelledCfdi(tx)
    && tx.cfdi_tipo !== "P",
  );

  const ingresos = mesTxs.filter(
    tx => tx.type === "in" && tx.efectivamente_cobrado !== false,
  );
  // Cash basis Art. 113-G LISR (RESICO) y Art. 5 LIVA: los gastos también
  // se reconocen hasta que se PAGAN. Una factura recibida pero no pagada
  // no acredita IVA ni deduce ISR ese mes.
  const egresos = mesTxs.filter(
    tx => tx.type === "out" && tx.efectivamente_cobrado !== false,
  );

  const ingresosCobrados = sum(ingresos.map(tx => num(tx.amount)));
  const egresosPagados   = sum(egresos.map(tx => num(tx.amount)));

  const ivaTrasladado = sum(ingresos.map(tx => num(tx.iva)));
  const ivaAcreditable = sum(
    egresos
      // BUG FIX: usamos isVigenteCfdi (acepta "vigente"/"Vigente"/"timbrado")
      // en lugar de string match exacto que descartaba IVA acreditable
      // legítimo cuando SAT devolvía "Vigente".
      // BUG FIX (auditor RESICO P0-1 forma_pago): IVA solo acreditable si
      // gasto pagado con medio bancarizado cuando > $2K (Art. 27-III LISR).
      .filter(tx => tx.es_deducible !== false && isVigenteCfdi(tx) && isFormaPagoDeducible(tx))
      .map(tx => num(tx.iva)),
  );
  const ivaRetenido = sum(ingresos.map(tx => num(tx.iva_retenido)));
  const isrRetenido = sum(ingresos.map(tx => num(tx.isr_retenido)));

  const isrNeto = calcISRNeto({
    ingresosCobrados,
    retencionesISR: isrRetenido,
  });
  const isr = { rate: calcISRBruto(ingresosCobrados).rate, bruto: isrNeto.bruto, aPagar: isrNeto.aPagar };

  const iva = calcIVA({
    ivaTrasladadoCobrado: ivaTrasladado,
    ivaAcreditablePagado: ivaAcreditable,
    ivaRetenido,
  });

  const totalAPagar = round2(isr.aPagar + Math.max(iva.aPagar, 0));

  const pct = (r: number) => (r * 100).toFixed(2) + "%";
  const $ = (n: number) => "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const breakdown: string[] = [
    `Periodo: ${periodo}`,
    `Ingresos efectivamente cobrados: ${$(ingresosCobrados)}`,
    `Tasa RESICO aplicable: ${pct(isr.rate)} (tramo hasta ${$(findBracketLimit(isr.rate))})`,
    `ISR bruto: ${$(ingresosCobrados)} × ${pct(isr.rate)} = ${$(isr.bruto)}`,
    `Menos ISR retenido (morales/plataformas): −${$(isrRetenido)}`,
    `= ISR a pagar: ${$(isr.aPagar)}`,
    `IVA trasladado (cobrado en CFDI pagados): ${$(ivaTrasladado)}`,
    `Menos IVA acreditable (gastos deducibles con CFDI): −${$(ivaAcreditable)}`,
    `Menos IVA retenido: −${$(ivaRetenido)}`,
    iva.aPagar > 0
      ? `= IVA a pagar: ${$(iva.aPagar)}`
      : `= IVA saldo a favor: ${$(iva.saldoAFavor)} (acreditable meses siguientes)`,
    `Total a pagar al SAT: ${$(totalAPagar)}`,
  ];

  return {
    periodo,
    ingresosCobrados: round2(ingresosCobrados),
    egresosPagados:   round2(egresosPagados),
    ivaTrasladado:    round2(ivaTrasladado),
    ivaAcreditable:   round2(ivaAcreditable),
    ivaRetenido:      round2(ivaRetenido),
    isrRetenido:      round2(isrRetenido),
    isr,
    iva,
    totalAPagar,
    breakdown,
  };
}

/* ─── helpers ───────────────────────────────────────────────────────── */

export function num(v: number | null | undefined): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

export function round2(n: number): number {
  // Round to cents; avoids float drift in totals.
  return Math.round(n * 100) / 100;
}

function findBracketLimit(rate: number): number {
  const b = RESICO_BRACKETS.find(x => x.rate === rate);
  return b ? b.limit : RESICO_BRACKETS[RESICO_BRACKETS.length - 1].limit;
}
