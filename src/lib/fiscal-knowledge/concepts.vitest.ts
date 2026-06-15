import { describe, it, expect } from "vitest";
import { allConcepts, getConcept, getConceptForSignalType, FISCAL_CONCEPTS } from "./index";

describe("fiscal-knowledge/concepts v0", () => {
  it("ningún concepto usa future_sat_source ni cita al SAT como fuente cargada", () => {
    for (const c of allConcepts()) {
      expect(c.sourceLevel).not.toBe("future_sat_source");
      expect(["general", "internal_rule", "requires_review"]).toContain(c.sourceLevel);
    }
  });

  it("cada concepto tiene definición, explicación, preguntas de revisión y caution", () => {
    for (const c of allConcepts()) {
      expect(c.shortDefinition.length).toBeGreaterThan(0);
      expect(c.userSafeExplanation.length).toBeGreaterThan(0);
      expect(c.reviewQuestions.length).toBeGreaterThan(0);
      expect(c.caution.length).toBeGreaterThan(0);
      expect(c.relatedSignalTypes.length).toBeGreaterThan(0);
    }
  });

  it("no usa claims prohibidos inequívocos", () => {
    const json = JSON.stringify(FISCAL_CONCEPTS).toLowerCase();
    for (const bad of ["contador ia", "tu contador", "sat confirmado", "declaración lista", "declaracion lista", "pago listo", "100% seguro", "nunca se equivoca", "automatización total"]) {
      expect(json).not.toContain(bad);
    }
  });

  it("regresión (re-verificación 6B): conceptos tentativos y sin solape SAT", () => {
    // ingresos: ya no afirma como certeza plana
    expect(getConcept("ingresos_cobrados")!.shortDefinition).toContain("en general");
    // PPD: sentido fiscal correcto (no cuenta hasta el complemento), no invertido
    expect(getConcept("ppd_sin_complemento")!.userSafeExplanation.toLowerCase()).toContain("no cuenta");
    // decisión local: caution ya no repite "SAT" (LIMIT lo añade una sola vez)
    expect(getConcept("confirmado_local")!.caution).not.toContain("SAT");
    expect(getConcept("excluido_local")!.caution).not.toContain("SAT");
  });

  it("getConcept / getConceptForSignalType resuelven y devuelven null si no existe", () => {
    expect(getConcept("cfdi_cancelado")?.id).toBe("cfdi_cancelado");
    expect(getConcept("no_existe")).toBeNull();
    expect(getConceptForSignalType("retencion_pendiente")?.id).toBe("retencion");
    expect(getConceptForSignalType("cfdi_cancelado")?.id).toBe("cfdi_cancelado");
  });
});
