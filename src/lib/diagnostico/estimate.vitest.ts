import { describe, it, expect } from "vitest";
import { estimateDiagnostico, mxn, type DiagnosticoInput } from "./estimate";

const base: DiagnosticoInput = {
  regime: "resico_pf",
  ingreso: 30_000,
  gastosCFDI: "no",
  retenciones: "no",
  period: "2026-05",
  now: new Date(2026, 5, 13), // 13-jun-2026 (mes 5 = junio, 0-indexed)
};

describe("estimateDiagnostico", () => {
  it("RESICO PF: ISR = ingreso × tasa del tramo (Art. 113-E)", () => {
    const r = estimateDiagnostico(base);
    // 30,000 cae en el tramo 1.1% (hasta 50,000) → 330
    expect(r.isrRatePct).toBe(1.1);
    expect(r.isrEstimado).toBe(330);
    expect(r.regimeLabel).toBe("RESICO PF");
  });

  it("Honorarios: usa la tarifa Art. 96 (ISR > 0, sin tasa fija)", () => {
    const r = estimateDiagnostico({ ...base, regime: "honorarios" });
    expect(r.isrRatePct).toBeNull();
    expect(r.isrEstimado).toBeGreaterThan(0);
    expect(r.regimeLabel).toContain("Honorarios");
  });

  it("régimen 'unsure' asume RESICO como referencia y lo dice", () => {
    const r = estimateDiagnostico({ ...base, regime: "unsure" });
    expect(r.isrEstimado).toBe(330);
    expect(r.isrNota.toLowerCase()).toContain("confirma tu régimen");
    expect(r.pendientes).toContain("Confirmar tu régimen fiscal");
  });

  it("fecha límite = día 17 del mes siguiente; days desde now", () => {
    const r = estimateDiagnostico(base); // periodo mayo → límite 17 de junio
    expect(r.deadlineLabel).toBe("17 de junio");
    expect(r.daysToDeadline).toBe(4); // 13-jun → 17-jun
  });

  it("readiness de guest está topado (sin CFDIs no se llega a 'listo')", () => {
    const r = estimateDiagnostico({ regime: "resico_pf", ingreso: 30_000, gastosCFDI: "si", retenciones: "si", period: "2026-05", now: base.now });
    expect(r.readinessPct).toBeLessThanOrEqual(45);
    expect(r.ivaTrasladado).toBe(4_800); // 30,000 × 16%
  });

  it("IVA sin gastos: explica que no hay acreditable, no inventa", () => {
    const r = estimateDiagnostico(base);
    expect(r.ivaNota.toLowerCase()).toContain("acreditable");
  });

  it("mxn formatea sin centavos", () => {
    expect(mxn(4832)).toContain("4,832");
  });
});
