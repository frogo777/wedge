import { describe, it, expect } from "vitest";
import { getDemoCfdis } from "@/lib/cfdi/fixtures";
import { redactPreviewForStorage } from "@/lib/cfdi/preview-store";
import { fiscalMonthFromCfdis } from "@/lib/mes/from-cfdis";
import { fiscalMonthFromDiagnosticDraft } from "@/lib/mes/from-diagnostic";
import { createDiagnosticDraft } from "@/lib/diagnostico/draft";
import { estimateDiagnostico } from "@/lib/diagnostico/estimate";
import { buildLukSignals } from "./signals";
import { buildLukExplanation, buildLukExplanations, getExplanationForSignalType, rankExplanations } from "./explanations";
import type { LukSignal, LukSignalType } from "./types";

const NOW = new Date("2026-06-14T00:00:00.000Z");
const demo = getDemoCfdis();
const month = fiscalMonthFromCfdis(demo, { period: "2026-06", regime: "resico_pf", now: NOW });
const signals = buildLukSignals({ month, cfdis: redactPreviewForStorage(demo), decisions: {}, now: NOW });
const byType = (t: LukSignalType): LukSignal => {
  const s = signals.find((x) => x.type === t);
  if (!s) throw new Error(`no signal for ${t}`);
  return s;
};

const diagDraft = createDiagnosticDraft(
  estimateDiagnostico({ regime: "resico_pf", ingreso: 40000, gastosCFDI: "unsure", retenciones: "unsure", period: "2026-06", now: NOW }),
  { regime: "resico_pf", incomeApprox: 40000, hasCfdiExpenses: "unsure", hasRetentions: "unsure", period: "2026-06" },
  NOW,
);
const diagSignals = buildLukSignals({ month: fiscalMonthFromDiagnosticDraft(diagDraft), now: NOW });

describe("luk/explanations", () => {
  it("genera explicación para CFDI cancelado (qué significa / qué revisar / fuente)", () => {
    const e = buildLukExplanation(byType("cfdi_cancelado"));
    expect(e.plainExplanation.toLowerCase()).toContain("cancel");
    expect(e.whatToReview.length).toBeGreaterThan(0);
    expect(e.sourceKind).toBe("general");
    expect(e.relatedConcepts).toContain("cfdi_cancelado");
  });

  it("genera explicación para IVA por revisar (requires_review)", () => {
    const e = buildLukExplanation(byType("iva_por_revisar"));
    expect(e.sourceKind).toBe("requires_review");
    expect(e.whyItMatters.length).toBeGreaterThan(0);
  });

  it("genera explicación para retención y PPD", () => {
    expect(buildLukExplanation(byType("retencion_pendiente")).relatedConcepts).toContain("retencion");
    expect(buildLukExplanation(byType("ppd_sin_complemento")).relatedConcepts).toContain("ppd_sin_complemento");
  });

  it("genera explicación para diagnóstico sin CFDIs", () => {
    const s = diagSignals.find((x) => x.type === "mes_desde_diagnostico");
    expect(s).toBeTruthy();
    const e = buildLukExplanation(s!);
    expect(e.plainExplanation.length).toBeGreaterThan(0);
  });

  it("toda explicación tiene disclaimer seguro (Wedge prepara; tú validas en SAT)", () => {
    for (const e of buildLukExplanations(signals)) {
      expect(e.userSafeDisclaimer.length).toBeGreaterThan(0);
      expect(e.userSafeDisclaimer).toContain("validas en SAT");
    }
  });

  it("no usa claims prohibidos inequívocos", () => {
    const json = JSON.stringify(buildLukExplanations(signals)).toLowerCase();
    for (const bad of ["contador ia", "tu contador", "sat confirmado", "declaración lista", "declaracion lista", "pago listo", "100% seguro", "nunca se equivoca", "automatización total"]) {
      expect(json).not.toContain(bad);
    }
  });

  it("señal sin concepto conocido usa fallback seguro", () => {
    const fake = { ...byType("cfdi_cancelado"), type: "tipo_inexistente" as LukSignalType };
    const e = buildLukExplanation(fake);
    expect(e.sourceKind).toBe("requires_review");
    expect(e.relatedConcepts).toHaveLength(0);
    expect(e.userSafeDisclaimer).toContain("validas en SAT");
  });

  it("getExplanationForSignalType devuelve explicación de concepto o null", () => {
    expect(getExplanationForSignalType("cfdi_cancelado")?.relatedConcepts).toContain("cfdi_cancelado");
    expect(getExplanationForSignalType("tipo_inexistente" as LukSignalType)).toBeNull();
  });

  it("rankExplanations ordena por confianza (alta primero), estable", () => {
    const ranked = rankExplanations(buildLukExplanations(signals));
    const firstMedia = ranked.findIndex((e) => e.confidence === "media");
    const lastAlta = ranked.map((e) => e.confidence).lastIndexOf("alta");
    if (firstMedia >= 0 && lastAlta >= 0) expect(lastAlta).toBeLessThan(firstMedia + 1);
  });
});
