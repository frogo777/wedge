/**
 * R7.4B — Reconciliación del ZIP principal (wedge-cfdi-synthetic-pack.zip).
 *
 * Reproduce el pipeline REAL de la app sobre el ZIP (unzip → decodeXmlBytes → parseMany →
 * inferUserRfc → normalize → FiscalMonth + inboxSummary + luk) y FIJA los números finales
 * verdaderos (no lo que "creíamos"). Sirve para que pack/tests/manual/Inbox/Mes digan lo mismo.
 *
 * Nota de entorno: vitest corre en Node (parser regex). El fix del encoding (prólogo→UTF-8) es
 * para el DOMParser del navegador; aquí se valida que el ISO se decodifica y cuenta (12 CFDIs).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { decodeXmlBytes, inferUserRfc, redactCfdiForClient } from "./upload";
import { parseMany } from "./parse";
import { normalizeCfdi } from "./normalize";
import { inboxSummary } from "./inbox";
import { fiscalMonthFromCfdis } from "@/lib/mes/from-cfdis";
import { buildLukSignals } from "@/lib/luk/signals";
import type { ParsedCFDI } from "@/lib/cfdi-parser";

const ZIP = join(process.cwd(), "fixtures/cfdi/synthetic/zip/wedge-cfdi-synthetic-pack.zip");
const NOW = new Date("2026-06-15T00:00:00");

function loadPack() {
  const entries = unzipSync(new Uint8Array(readFileSync(ZIP)));
  const parsed: ParsedCFDI[] = [];
  for (const name of Object.keys(entries)) {
    for (const r of parseMany(decodeXmlBytes(entries[name]))) if (r.ok) parsed.push(r.cfdi);
  }
  const userRfc = inferUserRfc(parsed);
  const cfdis = parsed.map((p) => normalizeCfdi(p, { userRfc, source: "zip" }));
  return { parsed, userRfc, cfdis };
}

describe("R7.4B reconciliación — wedge-cfdi-synthetic-pack.zip", () => {
  const { parsed, userRfc, cfdis } = loadPack();
  const month = fiscalMonthFromCfdis(cfdis, { period: "2026-06", regime: "resico_pf", now: NOW });
  const summary = inboxSummary(cfdis.map(redactCfdiForClient), {});

  it("12 entradas → 12 CFDIs parseados (incluye el caso ISO-8859-1)", () => {
    expect(parsed.length).toBe(12);
    expect(cfdis.length).toBe(12);
  });

  it("RFC del usuario inferido = sintético SYNU…", () => {
    expect(userRfc).toBe("SYNU010101AB1");
  });

  it("Fiscal Inbox: total 12 · 8 ingresos · 2 gastos · 1 PPD · 0 cancelados · 6 requieren revisión", () => {
    expect(summary.total).toBe(12);
    expect(summary.ingresosCount).toBe(8);
    expect(summary.gastosCount).toBe(2);
    expect(summary.pendientesComplemento).toBe(1);
    expect(summary.cancelados).toBe(0);
    expect(summary.requierenRevision).toBe(6);
  });

  it("Mes Fiscal: ingresos detectados $58,000 (USD excluido) · retenciones $3,575 (ISR 375 + IVA 3200)", () => {
    expect(month.incomeDetected).toBe(58000);
    expect(month.retentions).toBeCloseTo(3575, 0);
  });

  it("'Confirmar ingresos': 6 cobrables MXN por $58,000 — NO infla con el USD ni con el PPD", () => {
    const p = month.pendingActions.find((a) => a.id === "cfdi-confirmar-ingresos");
    expect(p).toBeTruthy();
    expect(p!.title).toContain("6");
    expect(p!.description).toContain("58,000");
  });

  it("luk genera al menos una señal (principal: PPD sin complemento)", () => {
    const signals = buildLukSignals({ month, cfdis: cfdis.map(redactCfdiForClient), decisions: {}, now: NOW });
    expect(signals.length).toBeGreaterThan(0);
  });
});
