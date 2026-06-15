import { describe, it, expect } from "vitest";
import { pendingActionsFromCfdis, risksFromCfdis } from "./pending-actions";
import { getDemoCfdis } from "./fixtures";

describe("cfdi/pending-actions", () => {
  const cfdis = getDemoCfdis();
  const pendings = pendingActionsFromCfdis(cfdis, { daysToDeadline: 10 });

  it("genera pending de IVA por revisar (hay gasto con IVA)", () => {
    expect(pendings.some((p) => p.type === "revisar_iva")).toBe(true);
  });

  it("genera pending de validar retención (hay retención ISR)", () => {
    expect(pendings.some((p) => p.type === "validar_retencion")).toBe(true);
  });

  it("genera pending de complemento de pago (hay PPD sin REP)", () => {
    expect(pendings.some((p) => p.id === "cfdi-complemento-pago")).toBe(true);
  });

  it("la próxima mejor acción es confirmar ingresos (current)", () => {
    expect(pendings[0].type).toBe("confirmar_ingreso");
    expect(pendings[0].status).toBe("current");
    // el resto quedan en todo
    expect(pendings.slice(1).every((p) => p.status === "todo")).toBe(true);
  });

  it("incluye cierre 'validar en SAT' (Wedge prepara; tú validas)", () => {
    const cierre = pendings.find((p) => p.type === "validar_en_sat");
    expect(cierre).toBeTruthy();
    expect(cierre?.description.toLowerCase()).toContain("wedge prepara; tú validas en sat");
  });

  it("genera risk de CFDI cancelado", () => {
    const risks = risksFromCfdis(cfdis);
    expect(risks.some((r) => r.id === "cfdi-risk-cancelado")).toBe(true);
    // el rojo (riesgo_real) NO se usa para cancelado/PPD (solo atención/info)
    expect(risks.every((r) => r.severity !== "riesgo_real")).toBe(true);
  });

  it("sin CFDIs → sin pendientes ni risks", () => {
    expect(pendingActionsFromCfdis([], {})).toHaveLength(0);
    expect(risksFromCfdis([])).toHaveLength(0);
  });
});
