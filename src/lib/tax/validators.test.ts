/**
 * Tests para validators.ts.
 * Run: npx tsx src/lib/tax/validators.test.ts
 */

import { isValidIsoDate, isCancelledCfdi, normalizeCfdiStatus } from "./validators";

function eq<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

const TESTS: Array<[string, () => void]> = [
  ["fechas válidas", () => {
    eq(isValidIsoDate("2026-04-30"), true,  "30-abr-2026");
    eq(isValidIsoDate("2024-02-29"), true,  "29-feb-2024 bisiesto");
    eq(isValidIsoDate("2025-02-28"), true,  "28-feb-2025 no-bisiesto");
    eq(isValidIsoDate("2000-02-29"), true,  "29-feb-2000 bisiesto siglo");
  }],

  ["rechaza mes/día imposibles", () => {
    eq(isValidIsoDate("2026-13-01"), false, "mes 13");
    eq(isValidIsoDate("2026-00-15"), false, "mes 0");
    eq(isValidIsoDate("2026-04-31"), false, "31 abr (mes de 30)");
    eq(isValidIsoDate("2026-04-32"), false, "día 32");
    eq(isValidIsoDate("2026-04-00"), false, "día 0");
    eq(isValidIsoDate("2026-13-40"), false, "13-40 (caso del roadmap)");
  }],

  ["rechaza 29-feb en años no-bisiestos", () => {
    eq(isValidIsoDate("2025-02-29"), false, "29-feb-2025");
    eq(isValidIsoDate("2026-02-29"), false, "29-feb-2026");
    eq(isValidIsoDate("1900-02-29"), false, "29-feb-1900 (siglo no-bisiesto)");
    eq(isValidIsoDate("2100-02-29"), false, "29-feb-2100");
  }],

  ["rechaza formato inválido", () => {
    eq(isValidIsoDate("2026-4-30"),    false, "mes sin pad");
    eq(isValidIsoDate("26-04-30"),     false, "año 2 dígitos");
    eq(isValidIsoDate("2026/04/30"),   false, "separador /");
    eq(isValidIsoDate(""),             false, "vacío");
    eq(isValidIsoDate(null as unknown), false, "null");
    eq(isValidIsoDate(20260430 as unknown), false, "número");
  }],

  ["rechaza año fuera de rango", () => {
    eq(isValidIsoDate("1899-01-01"), false, "antes de 1900");
    eq(isValidIsoDate("2201-01-01"), false, "después de 2200");
  }],

  ["isCancelledCfdi: case-insensitive + trim", () => {
    eq(isCancelledCfdi({ cfdi_status: "cancelado" }),     true,  "lowercase");
    eq(isCancelledCfdi({ cfdi_status: "Cancelado" }),     true,  "Capitalized");
    eq(isCancelledCfdi({ cfdi_status: "CANCELADO" }),     true,  "UPPERCASE");
    eq(isCancelledCfdi({ cfdi_status: " cancelado " }),   true,  "con espacios");
    eq(isCancelledCfdi({ cfdi_status: "  Cancelado\t" }), true,  "tab + spaces");
  }],

  ["isCancelledCfdi: rechaza otros status", () => {
    eq(isCancelledCfdi({ cfdi_status: "timbrado" }),     false, "timbrado");
    eq(isCancelledCfdi({ cfdi_status: "vigente" }),      false, "vigente");
    eq(isCancelledCfdi({ cfdi_status: "sin_cfdi" }),     false, "sin_cfdi");
    eq(isCancelledCfdi({ cfdi_status: null }),           false, "null");
    eq(isCancelledCfdi({ cfdi_status: undefined }),      false, "undefined");
    eq(isCancelledCfdi({}),                              false, "campo ausente");
  }],

  ["normalizeCfdiStatus", () => {
    eq(normalizeCfdiStatus("Cancelado"), "cancelado", "lowercase");
    eq(normalizeCfdiStatus("  TIMBRADO  "), "timbrado", "trim+lower");
    eq(normalizeCfdiStatus(null), "", "null → vacío");
    eq(normalizeCfdiStatus(undefined), "", "undefined → vacío");
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
console.log(`\nvalidators: ${passed} passed, ${failed} failed`);
if (failed > 0 && typeof process !== "undefined") process.exit(1);
