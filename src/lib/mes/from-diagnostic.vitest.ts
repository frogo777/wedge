import { describe, it, expect } from "vitest";
import { estimateDiagnostico, type DiagRegime, type TriState } from "../diagnostico/estimate";
import { createDiagnosticDraft } from "../diagnostico/draft";
import { fiscalMonthFromDiagnosticDraft } from "./from-diagnostic";

const NOW = new Date("2026-06-13T00:00:00.000Z");

function monthFrom(gastos: TriState, ret: TriState, regime: DiagRegime = "resico_pf") {
  const result = estimateDiagnostico({ regime, ingreso: 40_000, gastosCFDI: gastos, retenciones: ret, period: "2026-06", now: NOW });
  const draft = createDiagnosticDraft(result, { regime, incomeApprox: 40_000, hasCfdiExpenses: gastos, hasRetentions: ret, period: "2026-06" }, NOW);
  return fiscalMonthFromDiagnosticDraft(draft);
}

describe("fiscalMonthFromDiagnosticDraft", () => {
  it("genera un Mes Fiscal honesto (status diagnostico_guardado, sin CFDIs reales)", () => {
    const m = monthFrom("si", "si");
    expect(m.status).toBe("diagnostico_guardado");
    expect(m.cfdisIssued).toBe(0);
    expect(m.cfdisReceived).toBe(0);
    expect(m.incomeConfirmed).toBe(0);
    expect(m.nextBestAction?.type).toBe("traer_cfdis");
    expect(m.pendingActions.length).toBeGreaterThanOrEqual(3);
  });

  it("retenciones 'no estoy seguro' → aparece pending de validar retención", () => {
    const m = monthFrom("no", "unsure");
    expect(m.pendingActions.some((p) => p.type === "validar_retencion")).toBe(true);
  });

  it("gastos CFDI 'no estoy seguro' → aparece pending de revisar IVA", () => {
    const m = monthFrom("unsure", "no");
    expect(m.pendingActions.some((p) => p.type === "revisar_iva")).toBe(true);
  });

  it("retenciones 'no' → NO aparece pending de retención", () => {
    const m = monthFrom("no", "no");
    expect(m.pendingActions.some((p) => p.type === "validar_retencion")).toBe(false);
  });

  it("régimen 'no estoy seguro' → pending de confirmar régimen + risk info", () => {
    const m = monthFrom("no", "no", "unsure");
    expect(m.pendingActions.some((p) => p.title.toLowerCase().includes("régimen"))).toBe(true);
    expect(m.risks.some((r) => r.title.toLowerCase().includes("régimen"))).toBe(true);
    expect(m.regime).toBe("resico_pf"); // referencia cuando es unsure
  });
});
