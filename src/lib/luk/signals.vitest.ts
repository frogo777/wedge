import { describe, it, expect } from "vitest";
import { getDemoCfdis, DEMO_USER_RFC } from "@/lib/cfdi/fixtures";
import { redactPreviewForStorage } from "@/lib/cfdi/preview-store";
import { fiscalMonthFromCfdis } from "@/lib/mes/from-cfdis";
import { fiscalMonthFromDiagnosticDraft } from "@/lib/mes/from-diagnostic";
import { createDiagnosticDraft } from "@/lib/diagnostico/draft";
import { estimateDiagnostico } from "@/lib/diagnostico/estimate";
import { buildLukSignals, getPrimaryLukSignal, rankLukSignals, groupLukSignals } from "./signals";

const NOW = new Date("2026-06-14T00:00:00.000Z");

const demo = getDemoCfdis();
const demoMonth = fiscalMonthFromCfdis(demo, { period: "2026-06", regime: "resico_pf", now: NOW });
const redacted = redactPreviewForStorage(demo);
const demoSignals = buildLukSignals({ month: demoMonth, cfdis: redacted, decisions: {}, now: NOW });

const diagDraft = createDiagnosticDraft(
  estimateDiagnostico({ regime: "resico_pf", ingreso: 40000, gastosCFDI: "unsure", retenciones: "unsure", period: "2026-06", now: NOW }),
  { regime: "resico_pf", incomeApprox: 40000, hasCfdiExpenses: "unsure", hasRetentions: "unsure", period: "2026-06" },
  NOW,
);
const diagMonth = fiscalMonthFromDiagnosticDraft(diagDraft);
const emptyMonth = fiscalMonthFromCfdis([], { period: "2026-06", regime: "resico_pf", now: NOW });

describe("luk/signals", () => {
  it("genera señal para CFDI cancelado, IVA por revisar y retención pendiente (demo)", () => {
    const types = demoSignals.map((s) => s.type);
    expect(types).toContain("cfdi_cancelado");
    expect(types).toContain("iva_por_revisar");
    expect(types).toContain("retencion_pendiente");
  });

  it("genera señal de Mes basado en diagnóstico (sin CFDIs)", () => {
    const types = buildLukSignals({ month: diagMonth, now: NOW }).map((s) => s.type);
    expect(types).toContain("mes_desde_diagnostico");
  });

  it("NO genera señales con claims de SAT confirmado/validado", () => {
    const json = JSON.stringify(demoSignals).toLowerCase();
    expect(json).not.toContain("sat confirmado");
    expect(json).not.toContain("validado por sat");
    expect(json).not.toContain("contador ia");
  });

  it("rankea warning antes de info", () => {
    const withInfo = buildLukSignals({ month: demoMonth, cfdis: redacted, decisions: { [redacted[0].id]: "confirmado" }, now: NOW });
    const ranked = rankLukSignals(withInfo);
    const warnIdx = ranked.findIndex((s) => s.severity === "warning");
    const infoIdx = ranked.findIndex((s) => s.type === "confirmados_localmente");
    expect(warnIdx).toBeGreaterThanOrEqual(0);
    expect(infoIdx).toBeGreaterThan(warnIdx);
  });

  it("la señal principal es la más accionable (no info)", () => {
    const primary = getPrimaryLukSignal(demoSignals);
    expect(primary).not.toBeNull();
    expect(primary!.severity).not.toBe("info");
  });

  it("las señales NO incluyen RFC ni UUID completos", () => {
    const json = JSON.stringify(demoSignals);
    expect(json).not.toContain(DEMO_USER_RFC);
    expect(json).not.toContain("00000000-0000-4000-8000");
    expect(json).not.toMatch(/[A-Z]{3,4}\d{6}[A-Z0-9]{3}/); // patrón de RFC
  });

  it("confirmar un CFDI terminal (cancelado) NO genera señal de confirmados_localmente", () => {
    const cancelado = redacted.find((c) => c.status === "cancelado")!;
    const s = buildLukSignals({ month: demoMonth, cfdis: redacted, decisions: { [cancelado.id]: "confirmado" }, now: NOW });
    expect(s.some((x) => x.type === "confirmados_localmente")).toBe(false);
  });

  it("empty state: sin datos suficientes no inventa señales", () => {
    expect(buildLukSignals({ month: emptyMonth, now: NOW })).toHaveLength(0);
  });

  it("no duplica tipos y cada señal explica (impacto/riesgo/acción)", () => {
    const types = demoSignals.map((s) => s.type);
    expect(new Set(types).size).toBe(types.length); // sin tipos duplicados
    for (const s of demoSignals) {
      expect(s.impact.length).toBeGreaterThan(0);
      expect(s.risk.length).toBeGreaterThan(0);
      expect(s.nextAction.length).toBeGreaterThan(0);
    }
  });

  it("groupLukSignals parte por severidad", () => {
    const g = groupLukSignals(demoSignals);
    expect(g.warning.some((s) => s.type === "cfdi_cancelado")).toBe(true);
    expect(g.blocker).toHaveLength(0); // 6A no usa blocker
  });
});
