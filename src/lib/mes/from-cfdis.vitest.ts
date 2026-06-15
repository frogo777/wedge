import { describe, it, expect } from "vitest";
import { fiscalMonthFromCfdis } from "./from-cfdis";
import { getDemoCfdis } from "@/lib/cfdi/fixtures";

const NOW = new Date("2026-06-13T00:00:00.000Z");

describe("fiscalMonthFromCfdis", () => {
  const mes = fiscalMonthFromCfdis(getDemoCfdis(), {
    period: "2026-06",
    regime: "resico_pf",
    now: NOW,
  });

  it("produce un Mes Fiscal en revisión, honesto (nada confirmado aún)", () => {
    expect(mes.status).toBe("en_revision");
    expect(mes.incomeConfirmed).toBe(0);
    expect(mes.monthLabel).toBe("Junio 2026");
    expect(mes.regimeLabel).toBe("RESICO PF");
    expect(mes.evidenceStatus).toBe("parcial");
    expect(mes.satGuideStatus).toBe("no_aplica");
  });

  it("calcula cifras con el motor canónico (RESICO): ingresos 50,000 → ISR 300, IVA 7,360", () => {
    // 18000 + 12000 + 20000 = 50000 (PPD no cobrado y cancelado excluidos)
    expect(mes.incomeDetected).toBe(50000);
    // ISR bruto 50000 × 1.1% = 550; − retención 250 = 300
    expect(mes.isrEstimate).toBe(300);
    // IVA: 8000 trasladado − 640 acreditable = 7360
    expect(mes.ivaEstimate).toBe(7360);
    expect(mes.retentions).toBe(250);
  });

  it("cuenta CFDIs emitidos/recibidos (excluye cancelados)", () => {
    expect(mes.cfdisIssued).toBe(5);
    expect(mes.cfdisReceived).toBe(1);
  });

  it("la próxima mejor acción es confirmar ingresos y hay cierre de validar en SAT", () => {
    expect(mes.nextBestAction?.type).toBe("confirmar_ingreso");
    expect(mes.pendingActions.some((p) => p.type === "validar_en_sat")).toBe(true);
    expect(mes.pendingActions.some((p) => p.type === "revisar_iva")).toBe(true);
  });

  it("expone el riesgo de CFDI cancelado", () => {
    expect(mes.risks.some((r) => r.id === "cfdi-risk-cancelado")).toBe(true);
  });

  it("NO contiene claims prohibidos", () => {
    const json = JSON.stringify(mes).toLowerCase();
    for (const bad of [
      "declaración lista", "declaracion lista", "sat confirmado", "confirmado con sat",
      "pago listo", "declaramos por ti", "automátic", "autopilot", "100% seguro",
      "nunca se equivoca",
    ]) {
      expect(json).not.toContain(bad);
    }
  });

  it("sin CFDIs → status sin_datos y progreso 0", () => {
    const vacio = fiscalMonthFromCfdis([], { period: "2026-06", regime: "resico_pf", now: NOW });
    expect(vacio.status).toBe("sin_datos");
    expect(vacio.progress).toBe(0);
    expect(vacio.incomeDetected).toBe(0);
  });
});
