import { describe, it, expect } from "vitest";
import { estimateDiagnostico } from "./estimate";
import {
  createDiagnosticDraft, isDiagnosticDraftFresh, monthLabelFromPeriod,
} from "./draft";

const NOW = new Date("2026-06-13T00:00:00.000Z");

function buildDraft(opts?: { regime?: "resico_pf" | "honorarios" | "unsure"; gastos?: "si" | "no" | "unsure"; ret?: "si" | "no" | "unsure" }) {
  const regime = opts?.regime ?? "resico_pf";
  const gastos = opts?.gastos ?? "unsure";
  const ret = opts?.ret ?? "unsure";
  const result = estimateDiagnostico({ regime, ingreso: 48_200, gastosCFDI: gastos, retenciones: ret, period: "2026-06", now: NOW });
  return createDiagnosticDraft(result, { regime, incomeApprox: 48_200, hasCfdiExpenses: gastos, hasRetentions: ret, period: "2026-06" }, NOW);
}

describe("DiagnosticDraft", () => {
  it("NO incluye campos/datos sensibles (RFC, CIEC, e.firma, FIEL, CURP, UUID)", () => {
    const draft = buildDraft();
    const json = JSON.stringify(draft).toLowerCase();
    for (const forbidden of ["rfc", "ciec", "e.firma", "efirma", "fiel", "curp", "uuid"]) {
      expect(json).not.toContain(forbidden);
    }
    // Tampoco propiedades con esos nombres.
    expect(draft).not.toHaveProperty("rfc");
    expect(draft).not.toHaveProperty("ciec");
  });

  it("guarda solo lo mínimo: ingreso aproximado + respuestas + resumen", () => {
    const draft = buildDraft();
    expect(draft.incomeApprox).toBe(48_200);
    expect(draft.source).toBe("diagnostico-publico");
    expect(draft.monthLabel).toBe("Junio 2026");
    expect(draft.estimateSummary.isrEstimado).toBeTypeOf("number");
  });

  it("monthLabelFromPeriod formatea bien", () => {
    expect(monthLabelFromPeriod("2026-06")).toBe("Junio 2026");
    expect(monthLabelFromPeriod("2026-12")).toBe("Diciembre 2026");
    expect(monthLabelFromPeriod("bad")).toBe("bad");
  });

  it("es fresco recién creado y stale tras 30+ días", () => {
    const draft = buildDraft();
    expect(isDiagnosticDraftFresh(draft, new Date("2026-06-14T00:00:00.000Z"))).toBe(true);
    expect(isDiagnosticDraftFresh(draft, new Date("2026-06-30T00:00:00.000Z"))).toBe(true);
    expect(isDiagnosticDraftFresh(draft, new Date("2026-08-01T00:00:00.000Z"))).toBe(false);
  });
});
