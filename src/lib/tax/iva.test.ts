/**
 * Tests para getIVARate y aplicación frontera en arrendamiento.
 * Run: npx tsx src/lib/tax/iva.test.ts
 */

import { getIVARate, IVA_GENERAL, IVA_FRONTERA } from "./iva";
import { calcIsrArrendamiento } from "./calculators/isr-arrendamiento";
import { simulateRegimeChange } from "./calculators/simulate-regime-change";

function eq<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function near(actual: number, expected: number, eps: number, label: string) {
  if (Math.abs(actual - expected) > eps) {
    throw new Error(`${label}\n  expected ~${expected}\n  actual    ${actual}`);
  }
}

const TESTS: Array<[string, () => void]> = [
  ["getIVARate default = 16%", () => {
    eq(getIVARate(), IVA_GENERAL, "sin profile");
    eq(getIVARate(null), IVA_GENERAL, "null profile");
    eq(getIVARate({}), IVA_GENERAL, "profile sin flag");
    eq(getIVARate({ iva_frontera: false }), IVA_GENERAL, "flag false");
    eq(getIVARate({ iva_frontera: null }), IVA_GENERAL, "flag null");
  }],

  ["getIVARate frontera = 8%", () => {
    eq(getIVARate({ iva_frontera: true }), IVA_FRONTERA, "flag true");
    eq(IVA_FRONTERA, 0.08, "constante 8%");
  }],

  ["arrendamiento comercial general (16%)", () => {
    const r = calcIsrArrendamiento({
      rentaMensual: 30000,
      uso: "comercial",
      opcionCiega: true,
      periodo: "2026-04",
    });
    if (!r.ok) throw new Error("calc falló: " + r.error);
    near(r.ivaCausado, 30000 * 0.16, 0.01, "IVA causado 16%");
    eq(r.ivaRetenido, 0, "sin retención (PF)");
  }],

  ["arrendamiento comercial frontera (8%)", () => {
    const r = calcIsrArrendamiento({
      rentaMensual: 30000,
      uso: "comercial",
      opcionCiega: true,
      periodo: "2026-04",
      ivaRate: 0.08,
    });
    if (!r.ok) throw new Error("calc falló: " + r.error);
    near(r.ivaCausado, 30000 * 0.08, 0.01, "IVA causado 8%");
  }],

  ["arrendamiento comercial frontera con retención PM", () => {
    // Frontera 8%, PM retiene 10/16 partes = 5% sobre renta
    const r = calcIsrArrendamiento({
      rentaMensual: 30000,
      uso: "comercial",
      arrendatarioEsPersonaMoral: true,
      opcionCiega: true,
      periodo: "2026-04",
      ivaRate: 0.08,
    });
    if (!r.ok) throw new Error("calc falló");
    near(r.ivaCausado, 2400, 0.01, "IVA causado 8% = 2400");
    near(r.ivaRetenido, 30000 * (10 / 16) * 0.08, 0.01,
      "retención = renta × 10/16 × 0.08 = 1500");
    near(r.ivaNetoTrasladado, 2400 - 1500, 0.01, "neto trasladado 900");
  }],

  ["arrendamiento habitacional: SIEMPRE exento de IVA", () => {
    const r = calcIsrArrendamiento({
      rentaMensual: 15000,
      uso: "habitacional",
      opcionCiega: true,
      periodo: "2026-04",
      ivaRate: 0.08, // aunque pase frontera, habitacional sigue exento
    });
    if (!r.ok) throw new Error("calc falló");
    eq(r.ivaCausado, 0, "habitacional exento Art. 20-II LIVA");
  }],

  ["simulateRegimeChange propaga frontera al IVA", () => {
    const general = simulateRegimeChange({
      ingresos_anuales: 600_000,
      gastos_deducibles: 100_000,
    });
    const frontera = simulateRegimeChange({
      ingresos_anuales: 600_000,
      gastos_deducibles: 100_000,
      iva_frontera: true,
    });
    if (!general.ok || !frontera.ok) throw new Error("sim falló");
    const honGen = general.rows.find(r => r.regimen === "honorarios");
    const honFr  = frontera.rows.find(r => r.regimen === "honorarios");
    if (!honGen || !honFr) throw new Error("falta honorarios");
    // IVA general = (600k-100k) × 0.16 = 80k. Frontera = × 0.08 = 40k.
    near(honGen.iva_neto_estimado, 80_000, 1, "IVA gen 80k");
    near(honFr.iva_neto_estimado,  40_000, 1, "IVA frontera 40k");
    near(honFr.iva_neto_estimado, honGen.iva_neto_estimado / 2, 1, "frontera = mitad");
  }],

  ["ivaRate inválido (negativo) cae a 16%", () => {
    const r = calcIsrArrendamiento({
      rentaMensual: 30000,
      uso: "comercial",
      opcionCiega: true,
      periodo: "2026-04",
      ivaRate: -1,
    });
    if (!r.ok) throw new Error("calc falló");
    near(r.ivaCausado, 30000 * 0.16, 0.01, "negativo se ignora → 16%");
  }],
];

let passed = 0, failed = 0;
for (const [name, fn] of TESTS) {
  try {
    fn();
    passed++;
    console.log(`  ok ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}\n    ${(err as Error).message}`);
  }
}
console.log(`\niva: ${passed} passed, ${failed} failed`);
if (failed > 0 && typeof process !== "undefined") process.exit(1);
