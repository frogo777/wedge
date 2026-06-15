/**
 * R7.4A — valida el paquete de CFDIs SINTÉTICOS en fixtures/cfdi/synthetic/xml/.
 *
 * Lee los .xml generados (igual que la app: bytes → decodeXmlBytes → parser → normalize) y verifica
 * parsing, clasificación, retenciones (concepto y documento), PPD/REP, USD, UsoCFDI, encoding ISO-8859-1,
 * el Mes Fiscal agregado, señales luk, y privacidad (sin RFC/UUID/nombres crudos). Cero datos reales.
 *
 * Si este test falla por "ENOENT", corre primero: npm run fixtures:cfdi
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCFDI } from "@/lib/cfdi-parser";
import { normalizeCfdi } from "./normalize";
import { decodeXmlBytes, redactCfdiForClient } from "./upload";
import { cfdiToTransaction, cfdisToTransactions } from "./taxes";
import { fiscalMonthFromCfdis } from "@/lib/mes/from-cfdis";
import { buildMonthlyDeclaration } from "@/lib/tax/resico";
import { buildLukSignals } from "@/lib/luk/signals";
import type { NormalizedCfdi } from "./types";

const XML_DIR = join(process.cwd(), "fixtures/cfdi/synthetic/xml");
const USER_RFC = "SYNU010101AB1";
const UUID1 = "00000000-0000-4000-8000-000000000001";

function load(file: string): NormalizedCfdi {
  const bytes = new Uint8Array(readFileSync(join(XML_DIR, file)));
  const text = decodeXmlBytes(bytes); // mismo camino que readXmlFile en la app
  const p = parseCFDI(text);
  if ("error" in p) throw new Error(`${file}: ${p.error}`);
  return normalizeCfdi(p, { userRfc: USER_RFC, source: "xml" });
}

const JUN_FILES = [
  "01-ingreso-pue-mxn.xml", "02-ingreso-ret-isr.xml", "03-ingreso-ret-iva.xml",
  "04-ingreso-plataforma-ret-concepto.xml", "05-ingreso-plataforma-ret-documento.xml",
  "06-ingreso-ppd.xml", "07-rep-complemento.xml", "08-gasto-g03-deducible.xml",
  "09-gasto-s01-no-claro.xml", "10-egreso-nota-credito.xml", "11-ingreso-usd.xml",
  "12-ingreso-iso8859.xml",
];

describe("R7.4A synthetic pack — parsing por caso", () => {
  it("01: ingreso PUE MXN — emitido, cobrado, IVA 1600", () => {
    const c = load("01-ingreso-pue-mxn.xml");
    expect(c.type).toBe("ingreso");
    expect(c.direction).toBe("emitido");
    expect(c.taxes.ivaTrasladado).toBe(1600);
    expect(cfdiToTransaction(c)?.efectivamente_cobrado).toBe(true);
  });
  it("02: retención ISR (concepto) = 125", () => {
    expect(load("02-ingreso-ret-isr.xml").taxes.isrRetenido).toBe(125);
  });
  it("03: retención IVA (concepto) ≈ 1066.67", () => {
    expect(load("03-ingreso-ret-iva.xml").taxes.ivaRetenido).toBeCloseTo(1066.67, 2);
  });
  it("04: plataforma — retención ISR+IVA a nivel concepto", () => {
    const c = load("04-ingreso-plataforma-ret-concepto.xml");
    expect(c.taxes.isrRetenido).toBe(125);
    expect(c.taxes.ivaRetenido).toBeCloseTo(1066.67, 2);
  });
  it("05: plataforma — retención SOLO a nivel documento se LEE (F1, no 0)", () => {
    const c = load("05-ingreso-plataforma-ret-documento.xml");
    expect(c.taxes.isrRetenido).toBe(125);
    expect(c.taxes.ivaRetenido).toBeCloseTo(1066.67, 2);
    expect(c.taxes.ivaTrasladado).toBe(1600); // no duplica el traslado por concepto
  });
  it("06: PPD — pendiente de complemento, NO cobrado", () => {
    const c = load("06-ingreso-ppd.xml");
    expect(c.status).toBe("pendienteComplemento");
    expect(cfdiToTransaction(c)?.efectivamente_cobrado).toBe(false);
  });
  it("07: REP (tipo P) — excluido, no es ingreso nuevo", () => {
    const c = load("07-rep-complemento.xml");
    expect(c.type).toBe("pago");
    expect(c.status).toBe("excluido");
    expect(cfdiToTransaction(c)).toBeNull();
  });
  it("08: gasto recibido UsoCFDI G03 — deducible probable", () => {
    const c = load("08-gasto-g03-deducible.xml");
    const tx = cfdiToTransaction(c);
    expect(tx?.type).toBe("out");
    expect(tx?.es_deducible).toBe(true);
  });
  it("09: gasto recibido UsoCFDI S01 — NO se asume deducible", () => {
    const tx = cfdiToTransaction(load("09-gasto-s01-no-claro.xml"));
    expect(tx?.type).toBe("out");
    expect(tx?.es_deducible).toBe(false);
  });
  it("10: egreso / nota de crédito — no entra al cálculo automático", () => {
    const c = load("10-egreso-nota-credito.xml");
    expect(c.type).toBe("egreso");
    expect(cfdiToTransaction(c)).toBeNull();
  });
  it("11: USD — excluido del auto-cálculo + warning de moneda", () => {
    const c = load("11-ingreso-usd.xml");
    expect(c.currency).toBe("USD");
    expect(cfdiToTransaction(c)).toBeNull();
    expect(c.warnings.some((w) => /moneda/i.test(w))).toBe(true);
  });
  it("12: encoding ISO-8859-1 — acentos correctos (sin mojibake)", () => {
    const c = load("12-ingreso-iso8859.xml");
    expect(c.issuerName).toContain("Núñez");
    expect(c.issuerName).not.toContain("�");
  });
  it("13: ingreso de mayo — monthKey 2026-05", () => {
    expect(load("13-ingreso-mayo.xml").monthKey).toBe("2026-05");
  });
});

describe("R7.4A synthetic pack — Mes Fiscal agregado (junio)", () => {
  const cfdis = JUN_FILES.map(load);

  it("ingresos cobrados = 58,000 (6 ingresos PUE MXN: 01-05 + 12 ISO; PPD/USD/REP/egreso fuera)", () => {
    const decl = buildMonthlyDeclaration(cfdisToTransactions(cfdis), "2026-06");
    expect(decl.ingresosCobrados).toBe(58000);
  });
  it("retención ISR total = 375 (02+04+05; incluye la de nivel DOCUMENTO → F1)", () => {
    const decl = buildMonthlyDeclaration(cfdisToTransactions(cfdis), "2026-06");
    expect(decl.isrRetenido).toBe(375); // sin F1 (perder doc-level del 05) daría 250
  });
  it("fiscalMonthFromCfdis produce un Mes Fiscal con ingresos > 0 y retenciones > 0", () => {
    const m = fiscalMonthFromCfdis(cfdis, { period: "2026-06", regime: "resico_pf", now: new Date("2026-06-15T00:00:00") });
    expect(m.incomeDetected).toBeGreaterThan(0);
    expect(m.retentions).toBeGreaterThan(0);
  });
  it("luk genera al menos una señal sobre el set sintético", () => {
    const m = fiscalMonthFromCfdis(cfdis, { period: "2026-06", regime: "resico_pf", now: new Date("2026-06-15T00:00:00") });
    const signals = buildLukSignals({ month: m, cfdis: cfdis.map(redactCfdiForClient), decisions: {}, now: new Date("2026-06-15T00:00:00") });
    expect(signals.length).toBeGreaterThan(0);
  });
});

describe("R7.4A synthetic pack — privacidad", () => {
  it("el RedactedCfdi NO expone UUID crudo ni RFC completo ni nombres fiscales", () => {
    const redacted = JUN_FILES.map((f) => redactCfdiForClient(load(f)));
    const json = JSON.stringify(redacted);
    expect(json).not.toContain(USER_RFC);          // RFC del usuario sintético
    expect(json).not.toContain(UUID1);             // UUID crudo
    expect(json).not.toContain("Núñez");           // nombre fiscal (caso ISO)
    expect(json).not.toContain("issuerName");      // el campo ni siquiera existe
    for (const r of redacted) expect("uuid" in r).toBe(false);
  });
});
