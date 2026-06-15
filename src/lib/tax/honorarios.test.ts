/**
 * Tests for the Honorarios (Actividad Empresarial y Profesional) tax library.
 *
 * Pattern matches src/lib/referrals.test.ts — plain assertions, no runner.
 * Run via:
 *   npx tsx src/lib/tax/honorarios.test.ts
 */

import {
  HONORARIOS_TABLE,
  HONORARIOS_TABLE_2025,
  HONORARIOS_TABLE_2026,
  buildHonorariosDeclaration,
  calcHonorariosISR,
  calcHonorariosISRNeto,
  getHonorariosTable,
} from "./honorarios";
import { getUMAForDate } from "./calculators/constants";
import type { Transaction } from "./resico";

/* ─── helpers ───────────────────────────────────────── */

function eq<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(
      `${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`,
    );
  }
}
function truthy(v: unknown, label: string) {
  if (!v) throw new Error(`${label} (expected truthy, got ${JSON.stringify(v)})`);
}
function near(actual: number, expected: number, tolerance: number, label: string) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}\n  expected ~${expected}\n  actual    ${actual}`);
  }
}

function tx(over: Partial<Transaction>): Transaction {
  return {
    id:          "t-" + Math.random().toString(36).slice(2, 8),
    description: "x",
    amount:      0,
    type:        "in",
    date:        "2026-04-15",
    category:    null,
    cfdi_status: "timbrado",
    ...over,
  };
}

/* ─── tests ─────────────────────────────────────────── */

async function testBracketBoundaries() {
  // Tabla 2026: tramo 1 termina en 844.59. Pasamos periodo explícito.
  const a = calcHonorariosISR({ ingresosCobrados: 844.59, gastosDeducibles: 0, periodo: "2026-04" });
  eq(a.porcentaje, 0.0192, "844.59 falls in tramo 1 (2026)");
  eq(a.bracket.limiteSuperior, 844.59, "tramo 1 upper bound (2026)");

  // 844.60 — primer centavo del tramo 2 (0.0640) en tabla 2026.
  const b = calcHonorariosISR({ ingresosCobrados: 844.60, gastosDeducibles: 0, periodo: "2026-04" });
  eq(b.porcentaje, 0.0640, "844.60 falls in tramo 2 (2026)");
  eq(b.bracket.limiteInferior, 844.60, "tramo 2 lower bound (2026)");

  // Sanity histórico: pasando periodo 2025 obtenemos los límites viejos.
  const c = calcHonorariosISR({ ingresosCobrados: 746.04, gastosDeducibles: 0, periodo: "2025-04" });
  eq(c.porcentaje, 0.0192, "746.04 falls in tramo 1 (2025)");
  eq(c.bracket.limiteSuperior, 746.04, "tramo 1 upper bound (2025)");
}

async function testISRForTypicalIncome() {
  // 30,000 base en 2026 → tramo 6 (17,533.65 – 35,362.83, 21.36%).
  const r = calcHonorariosISR({ ingresosCobrados: 30000, gastosDeducibles: 0, periodo: "2026-04" });
  eq(r.porcentaje, 0.2136, "30k → 21.36% (tramo 6 2026)");
  // cuotaFija 1856.84 + (30000 − 17533.65) × 0.2136
  near(r.isr, 1856.84 + (30000 - 17533.65) * 0.2136, 0.05, "ISR ≈ manual calc (2026)");
  near(r.baseGravable, 30000, 0.001, "baseGravable = 30k");
}

async function testRetencionesCapAtZero() {
  // Retenido > bruto → aPagar = 0 (never negative).
  const r = calcHonorariosISRNeto({
    ingresosCobrados: 5000,
    gastosDeducibles: 0,
    retencionesISR: 99999,
  });
  truthy(r.isr > 0, "bruto positive");
  eq(r.aPagar, 0, "aPagar capped at 0");
  eq(r.retenido, 99999, "retenido echoed");
}

async function testBaseGravableNeverNegative() {
  // gastos > ingresos → base = 0 (no negative ISR via the neto helper).
  const r = calcHonorariosISR({ ingresosCobrados: 1000, gastosDeducibles: 5000 });
  eq(r.baseGravable, 0, "base = 0 when gastos > ingresos");
  // Same scenario through the neto helper: aPagar must never go negative.
  const neto = calcHonorariosISRNeto({
    ingresosCobrados: 1000,
    gastosDeducibles: 5000,
    retencionesISR: 0,
  });
  eq(neto.baseGravable, 0, "neto base = 0");
  truthy(neto.aPagar >= 0, "aPagar never negative");
}

async function testBuildDeclarationMatchesManualMath() {
  // Periodo enero 2026 (numeroMes=1) → tabla acumulada = tabla mensual,
  // por lo que el resultado del path acumulado (Art. 14 LISR) coincide
  // con el manual mes-a-mes. Mantener una tx de OTRO AÑO ("tx de otro
  // mes") para verificar que YTD filter excluye correctamente.
  const txs: Transaction[] = [
    // ingresos cobrados (cash basis) for January 2026
    tx({ type: "in",  amount: 30000, date: "2026-01-10", iva: 4800, isr_retenido: 0,    iva_retenido: 0 }),
    // gasto deducible (CFDI timbrado, es_deducible default true)
    tx({ type: "out", amount: 5000,  date: "2026-01-15", iva: 800, cfdi_status: "timbrado", es_deducible: true }),
    // gasto NO deducible — sin CFDI; debe excluirse de gastosDeducibles e IVA acreditable
    tx({ type: "out", amount: 2000,  date: "2026-01-18", iva: 320, cfdi_status: "sin_cfdi" }),
    // tx de otro AÑO — debe ignorarse (YTD filter por año)
    tx({ type: "in",  amount: 999999, date: "2025-12-05" }),
  ];

  const d = buildHonorariosDeclaration(txs, "2026-01");
  eq(d.periodo, "2026-01", "periodo");
  eq(d.ingresosCobrados, 30000, "ingresos del mes");
  eq(d.gastosPagados, 7000, "gastos pagados todos");
  eq(d.gastosDeducibles, 5000, "solo el gasto con CFDI cuenta como deducible");
  eq(d.baseGravable, 25000, "30k − 5k = 25k (mes 1, acumulado = mensual)");
  eq(d.ivaTrasladado, 4800, "IVA cobrado");
  eq(d.ivaAcreditable, 800, "IVA acreditable solo del gasto deducible");
  // IVA neto = 4800 − 800 − 0 = 4000 a pagar
  eq(d.iva.aPagar, 4000, "IVA a pagar");
  eq(d.iva.saldoAFavor, 0, "no saldo a favor");

  // Base 25,000 en 2026 → tramo 6 (17,533.65 – 35,362.83). Manual:
  // ISR = 1856.84 + (25,000 − 17,533.65) × 0.2136
  const expectedIsr = 1856.84 + (25000 - 17533.65) * 0.2136;
  near(d.isr.bruto, expectedIsr, 0.05, "ISR bruto matches manual");
  // No retenciones → aPagar = bruto
  near(d.isr.aPagar, expectedIsr, 0.05, "ISR a pagar (sin retenciones)");
  near(d.totalAPagar, expectedIsr + 4000, 0.05, "total = ISR + IVA");
  truthy(d.breakdown.length > 5, "breakdown populated");
}

async function testTableMonotonic() {
  // Sanity: each row's lower bound is one cent above the prior row's upper bound.
  for (const [label, table] of [
    ["2025", HONORARIOS_TABLE_2025] as const,
    ["2026", HONORARIOS_TABLE_2026] as const,
    ["default(HONORARIOS_TABLE)", HONORARIOS_TABLE] as const,
  ]) {
    for (let i = 1; i < table.length; i++) {
      const prev = table[i - 1];
      const cur  = table[i];
      near(cur.limiteInferior - prev.limiteSuperior, 0.01, 0.005,
        `${label} row ${i}: gap between ${prev.limiteSuperior} and ${cur.limiteInferior}`);
      truthy(cur.porcentaje >= prev.porcentaje, `${label} row ${i}: rate non-decreasing`);
    }
  }
}

async function testTableInternalConsistency() {
  // En cada límite superior, la cuota fija del siguiente tramo debe igualar
  // la cuota fija del tramo actual + (limSup-limInf) × pct (continuidad).
  for (const [label, table] of [
    ["2025", HONORARIOS_TABLE_2025] as const,
    ["2026", HONORARIOS_TABLE_2026] as const,
  ]) {
    for (let i = 0; i < table.length - 1; i++) {
      const cur = table[i];
      const next = table[i + 1];
      const expectedNextCuota = cur.cuotaFija + (cur.limiteSuperior - cur.limiteInferior) * cur.porcentaje;
      near(next.cuotaFija, expectedNextCuota, 0.5,
        `${label} tramo ${i + 1} cuotaFija continua desde tramo ${i}`);
    }
  }
}

async function testGetHonorariosTableSelectsByYear() {
  eq(getHonorariosTable("2025-04"), HONORARIOS_TABLE_2025, "2025-04 → tabla 2025");
  eq(getHonorariosTable("2026-01"), HONORARIOS_TABLE_2026, "2026-01 → tabla 2026");
  // Año desconocido cae al más reciente (fail-soft documentado).
  eq(getHonorariosTable("2030-06"), HONORARIOS_TABLE_2026, "año futuro → fallback al más reciente");
  // Periodo vacío también cae al más reciente.
  eq(getHonorariosTable(""), HONORARIOS_TABLE_2026, "periodo vacío → fallback");
}

async function testBuildDeclarationUsesPeriodoYear() {
  // Mismo monto, mismo escenario, dos periodos distintos → ISR DIFERENTE
  // porque las brackets cambian. Usamos enero (numeroMes=1) para que la
  // tabla acumulada coincida con la mensual y el manual sea comparable.
  const txs2025: Transaction[] = [
    { id: "t1", description: "x", amount: 30000, type: "in", date: "2025-01-10",
      category: null, cfdi_status: "timbrado" },
  ];
  const txs2026: Transaction[] = [
    { id: "t2", description: "x", amount: 30000, type: "in", date: "2026-01-10",
      category: null, cfdi_status: "timbrado" },
  ];
  const d25 = buildHonorariosDeclaration(txs2025, "2025-01");
  const d26 = buildHonorariosDeclaration(txs2026, "2026-01");
  // 2025 base 30k → tramo 6 (15,487.72-31,236.49) cuotaFija 1640.18
  near(d25.isr.bruto, 1640.18 + (30000 - 15487.72) * 0.2136, 0.05, "ISR 2025 con tabla 2025");
  // 2026 base 30k → tramo 6 (17,533.65-35,362.83) cuotaFija 1856.84
  near(d26.isr.bruto, 1856.84 + (30000 - 17533.65) * 0.2136, 0.05, "ISR 2026 con tabla 2026");
  truthy(d25.isr.bruto !== d26.isr.bruto, "ISR 2025 ≠ ISR 2026 (year-aware funciona)");
}

async function testEgresoCashBasis() {
  // Cash basis Art. 105 LISR: gastos no pagados NO deducen ni acreditan IVA.
  // Antes del fix, buildHonorariosDeclaration solo filtraba egresos por
  // es_deducible y cfdi_status, dejando que un PPD pendiente acreditara IVA.
  const txs: Transaction[] = [
    tx({ type: "in",  amount: 30000, date: "2026-04-10", iva: 4800,
         efectivamente_cobrado: true }),
    // Gasto deducible PERO no pagado todavía (PPD recibido) — NO debe contar.
    tx({ type: "out", amount: 5000,  date: "2026-04-15", iva: 800,
         cfdi_status: "timbrado", es_deducible: true,
         efectivamente_cobrado: false }),
    // Gasto deducible y pagado — sí cuenta.
    tx({ type: "out", amount: 2000,  date: "2026-04-20", iva: 320,
         cfdi_status: "timbrado", es_deducible: true,
         efectivamente_cobrado: true }),
  ];
  const d = buildHonorariosDeclaration(txs, "2026-04");
  eq(d.gastosPagados, 2000, "solo gasto pagado en gastosPagados");
  eq(d.gastosDeducibles, 2000, "solo gasto pagado deduce");
  eq(d.ivaAcreditable, 320, "IVA acreditable SOLO del gasto pagado");
  // base = 30000 - 2000 = 28000; IVA neto = 4800 - 320 - 0 = 4480
  eq(d.baseGravable, 28000, "base correcta sin gasto pendiente");
  eq(d.iva.aPagar, 4480, "IVA a pagar correcto");
}

async function testUMAYearAwareCrossingFebruary() {
  // Enero 2026 todavía usa UMA 2025 (la nueva entra el 1-feb).
  const ene = getUMAForDate("2026-01-15");
  eq(ene.year, 2025, "15-ene-2026 usa UMA 2025");
  eq(ene.diaria, 113.14, "UMA diaria ene-2026 = 113.14");

  // 1-feb-2026: cambio efectivo.
  const feb = getUMAForDate("2026-02-01");
  eq(feb.year, 2026, "1-feb-2026 usa UMA 2026");
  eq(feb.diaria, 117.31, "UMA diaria feb-2026 = 117.31");

  // Periodo `YYYY-MM` también debe funcionar.
  const ene2 = getUMAForDate("2026-01");
  eq(ene2.year, 2025, "periodo 2026-01 → UMA 2025");
  const feb2 = getUMAForDate("2026-02");
  eq(feb2.year, 2026, "periodo 2026-02 → UMA 2026");

  // Año futuro fail-soft al más reciente (2026 hoy).
  const future = getUMAForDate("2030-06-15");
  eq(future.year, 2026, "año futuro fallback");

  // Año previo cargado.
  const old = getUMAForDate("2025-08-10");
  eq(old.year, 2025, "agosto-2025 usa UMA 2025");
}

/* ─── runner ────────────────────────────────────────── */

const TESTS: Array<[string, () => Promise<void>]> = [
  ["bracket boundaries (746.04 vs 746.05)",     testBracketBoundaries],
  ["ISR calc for typical $30k monthly income",  testISRForTypicalIncome],
  ["retenciones cap at 0 (no negative aPagar)", testRetencionesCapAtZero],
  ["baseGravable >= 0 when gastos > ingresos",  testBaseGravableNeverNegative],
  ["buildHonorariosDeclaration matches manual", testBuildDeclarationMatchesManualMath],
  ["HONORARIOS_TABLE is monotonic & contiguous", testTableMonotonic],
  ["table internal consistency (cuotaFija continuity)", testTableInternalConsistency],
  ["getHonorariosTable selects by year",            testGetHonorariosTableSelectsByYear],
  ["buildDeclaration uses periodo year (2025 vs 2026)", testBuildDeclarationUsesPeriodoYear],
  ["UMA year-aware (Jan = prior year, Feb = current)",  testUMAYearAwareCrossingFebruary],
  ["egreso cash basis (gastos pendientes no acreditan)", testEgresoCashBasis],
];

export async function runHonorariosTests(): Promise<{ passed: number; failed: number }> {
  let passed = 0, failed = 0;
  for (const [name, fn] of TESTS) {
    try {
      await fn();
      passed++;
      console.log(`  ok ${name}`);
    } catch (err) {
      failed++;
      console.error(`  FAIL ${name}\n    ${(err as Error).message}`);
    }
  }
  console.log(`\nhonorarios: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

if (typeof require !== "undefined" && require.main === module) {
  runHonorariosTests().then(r => process.exit(r.failed === 0 ? 0 : 1));
}
