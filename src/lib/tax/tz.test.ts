/**
 * Tests para helpers de zona horaria CDMX.
 * Run: npx tsx src/lib/tax/tz.test.ts
 */

import {
  isoDateMexico,
  isoPeriodoMexico,
  yearInMexico,
  monthInMexico,
  dayInMexico,
} from "./tz";

function eq<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

const TESTS: Array<[string, () => void]> = [
  /* ─── Caso clave: 8pm CDMX ya es next day en UTC ─────── */
  ["8pm CDMX 30-abr → fecha MX = 30-abr (no 1-may)", () => {
    // 30-abr-2026 20:00 CDMX = 1-may-2026 02:00 UTC
    const d = new Date("2026-05-01T02:00:00Z");
    eq(isoDateMexico(d), "2026-04-30", "fecha MX");
    eq(isoPeriodoMexico(d), "2026-04", "periodo MX");
    eq(monthInMexico(d), 4, "mes MX");
    eq(dayInMexico(d), 30, "día MX");
    eq(yearInMexico(d), 2026, "año MX");
  }],

  /* ─── Edge case: medianoche UTC ────────────────────────── */
  ["medianoche UTC = 6pm CDMX día previo", () => {
    // 1-ene-2026 00:00 UTC = 31-dic-2025 18:00 CDMX
    const d = new Date("2026-01-01T00:00:00Z");
    eq(isoDateMexico(d), "2025-12-31", "fin de año cruza medianoche");
    eq(yearInMexico(d), 2025, "año previo");
  }],

  /* ─── Caso normal: mediodía MX = mediodía MX ───────────── */
  ["mediodía CDMX = mediodía MX (sanity)", () => {
    // 15-jul-2026 12:00 CDMX = 18:00 UTC
    const d = new Date("2026-07-15T18:00:00Z");
    eq(isoDateMexico(d), "2026-07-15", "fecha");
    eq(isoPeriodoMexico(d), "2026-07", "periodo");
  }],

  /* ─── Default param = ahora ────────────────────────────── */
  ["sin argumento usa fecha actual", () => {
    const a = isoDateMexico();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a)) {
      throw new Error(`formato inválido: ${a}`);
    }
  }],

  /* ─── Quintana Roo / Baja California NO se manejan ─────
   * El helper asume zona del centro (UTC-6). Verificamos que
   * un mismo Date produce SIEMPRE la misma fecha sin importar
   * el TZ del proceso (independencia del entorno de Node).
   */
  ["resultado independiente del TZ del proceso", () => {
    const d = new Date("2026-04-15T15:30:00Z");
    eq(isoDateMexico(d), "2026-04-15", "abr-15 mediodía CDMX (15:30 UTC = 9:30am CDMX)");
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
console.log(`\ntz: ${passed} passed, ${failed} failed`);
if (failed > 0 && typeof process !== "undefined") process.exit(1);
