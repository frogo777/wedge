/**
 * Documentation-style tests for RESICO PF tax math.
 *
 * Runner-agnostic: uses plain assertions and exports a `runResicoTests()`
 * function. Execute via ts-node / tsx or by any runner that awaits the
 * top-level call at the bottom of the file.
 */

import {
  resicoISRRate,
  calcISRBruto,
  calcISRNeto,
  calcIVA,
  buildMonthlyDeclaration,
  RESICO_BRACKETS,
  type Transaction,
} from "./resico";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error("assertion failed: " + msg);
}

function approx(a: number, b: number, eps = 0.01): boolean {
  return Math.abs(a - b) <= eps;
}

export function runResicoTests() {
  /* ─── brackets sanity ────────────────────────────────────────────── */
  assert(RESICO_BRACKETS.length === 5, "5 tramos");
  assert(RESICO_BRACKETS[0].rate === 0.01, "primer tramo 1.0%");
  assert(RESICO_BRACKETS[4].rate === 0.025, "último tramo 2.5%");

  /* ─── resicoISRRate at boundaries ────────────────────────────────── */
  assert(resicoISRRate(0)          === 0.01,  "0 → 1.0%");
  assert(resicoISRRate(24999.99)   === 0.01,  "24999.99 → 1.0%");
  assert(resicoISRRate(25000)      === 0.01,  "25000 exact → 1.0% (boundary)");
  assert(resicoISRRate(25000.01)   === 0.011, "25000.01 → 1.1%");
  assert(resicoISRRate(50000)      === 0.011, "50000 → 1.1%");
  assert(resicoISRRate(50000.01)   === 0.015, "50000.01 → 1.5%");
  assert(resicoISRRate(83333.33)   === 0.015, "83333.33 → 1.5%");
  assert(resicoISRRate(83333.34)   === 0.020, "83333.34 → 2.0%");
  assert(resicoISRRate(208333.33)  === 0.020, "208333.33 → 2.0%");
  assert(resicoISRRate(208333.34)  === 0.025, "208333.34 → 2.5%");
  assert(resicoISRRate(3_000_000)  === 0.025, "3M → 2.5%");

  /* ─── calcISRBruto ───────────────────────────────────────────────── */
  const b1 = calcISRBruto(10_000);
  assert(b1.rate === 0.01 && approx(b1.isr, 100), "10k → 100 @ 1.0%");

  const b2 = calcISRBruto(50_000);
  assert(b2.rate === 0.011 && approx(b2.isr, 550), "50k → 550 @ 1.1%");

  const b3 = calcISRBruto(100_000);
  assert(b3.rate === 0.02 && approx(b3.isr, 2000), "100k → 2000 @ 2.0%");

  /* ─── calcISRNeto with retention ─────────────────────────────────── */
  // 50,000 cobrado, 50,000 × 1.25% = 625 retenido por moral.
  // Bruto = 50,000 × 1.1% = 550  →  a pagar = max(0, 550 - 625) = 0.
  const n1 = calcISRNeto({ ingresosCobrados: 50_000, retencionesISR: 625 });
  assert(approx(n1.bruto, 550) && approx(n1.retenido, 625) && n1.aPagar === 0,
    "50k cobrado, 625 retenido → bruto 550, aPagar 0");

  // 100,000 cobrado, 500 retenido.
  // Bruto = 100,000 × 2.0% = 2,000  →  a pagar = 1,500.
  const n2 = calcISRNeto({ ingresosCobrados: 100_000, retencionesISR: 500 });
  assert(approx(n2.bruto, 2000) && approx(n2.aPagar, 1500),
    "100k cobrado, 500 retenido → aPagar 1500");

  /* ─── calcIVA saldo a favor ──────────────────────────────────────── */
  // Trasladado 1,600, acreditable 2,400 → saldo a favor 800.
  const iva1 = calcIVA({ ivaTrasladadoCobrado: 1600, ivaAcreditablePagado: 2400 });
  assert(iva1.aPagar === 0 && approx(iva1.saldoAFavor, 800) && approx(iva1.neto, -800),
    "IVA saldo a favor 800");

  /* ─── calcIVA a pagar con retención ─────────────────────────────── */
  // Trasladado 4,000, acreditable 1,600, retenido 266.67 → a pagar 2,133.33.
  const iva2 = calcIVA({
    ivaTrasladadoCobrado: 4000,
    ivaAcreditablePagado: 1600,
    ivaRetenido:          266.67,
  });
  assert(approx(iva2.aPagar, 2133.33) && iva2.saldoAFavor === 0,
    "IVA a pagar 2133.33");

  /* ─── full monthly declaration ──────────────────────────────────── */
  const txs: Transaction[] = [
    // Ingreso 1: honorarios a moral, 20,000 + 16% IVA = 23,200.
    // Retención ISR 1.25% = 250, retención IVA 2/3 = 2133.33.
    {
      id: "t1", description: "Honorarios cliente A",
      amount: 20000, type: "in", date: "2026-04-10",
      category: "Servicios prof.", cfdi_status: "timbrado",
      iva: 3200, isr_retenido: 250, iva_retenido: 2133.33,
      efectivamente_cobrado: true,
    },
    // Ingreso 2: venta a público general, 5,000 + IVA 800, sin retención.
    {
      id: "t2", description: "Venta público general",
      amount: 5000, type: "in", date: "2026-04-15",
      category: "Servicios prof.", cfdi_status: "timbrado",
      iva: 800,
      efectivamente_cobrado: true,
    },
    // Gasto deducible con CFDI: 3,000 + IVA 480.
    {
      id: "t3", description: "Renta oficina",
      amount: 3000, type: "out", date: "2026-04-05",
      category: "Arrendamiento", cfdi_status: "timbrado",
      deductibility: "100", iva: 480, es_deducible: true,
    },
    // Gasto no deducible (sin CFDI): no debe acreditar IVA.
    {
      id: "t4", description: "Comida personal",
      amount: 800, type: "out", date: "2026-04-20",
      category: "Representación", cfdi_status: "sin_cfdi",
      deductibility: "no", iva: 128, es_deducible: false,
    },
    // Otro mes — NO debe incluirse.
    {
      id: "t5", description: "Ingreso marzo",
      amount: 9999, type: "in", date: "2026-03-28",
      category: null, cfdi_status: "timbrado", iva: 1599.84,
    },
  ];

  const decl = buildMonthlyDeclaration(txs, "2026-04");

  assert(approx(decl.ingresosCobrados, 25000), "ingresos abril = 25,000");
  assert(approx(decl.egresosPagados,   3800),  "egresos abril = 3,800");
  assert(approx(decl.ivaTrasladado,    4000),  "IVA trasladado = 4,000 (3200 + 800)");
  assert(approx(decl.ivaAcreditable,   480),   "IVA acreditable = 480 (sólo CFDI timbrado + deducible)");
  assert(approx(decl.ivaRetenido,      2133.33), "IVA retenido = 2133.33");
  assert(approx(decl.isrRetenido,      250),   "ISR retenido = 250");

  // 25,000 cae en el primer tramo (≤ 25,000) → 1.0%.
  assert(decl.isr.rate === 0.01, "tasa ISR abril = 1.0%");
  assert(approx(decl.isr.bruto, 250), "ISR bruto = 250");
  assert(decl.isr.aPagar === 0, "ISR a pagar = 0 (retención ≥ bruto)");

  // IVA: 4000 − 480 − 2133.33 = 1386.67.
  assert(approx(decl.iva.aPagar, 1386.67), "IVA a pagar = 1386.67");
  assert(decl.iva.saldoAFavor === 0, "sin saldo a favor");

  assert(approx(decl.totalAPagar, 1386.67), "Total SAT = 1386.67");
  assert(decl.breakdown.length > 0, "breakdown tiene pasos");

  /* ─── empty month ───────────────────────────────────────────────── */
  const empty = buildMonthlyDeclaration([], "2026-05");
  assert(empty.ingresosCobrados === 0 && empty.totalAPagar === 0, "mes vacío = 0");

  return "ok";
}

if (typeof process !== "undefined" && process.env && process.env.RUN_RESICO_TESTS === "1") {
   
  console.log("resico tests:", runResicoTests());
}
