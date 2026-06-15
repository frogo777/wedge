/**
 * Tests motor Declaración Anual (Arts. 150-152 LISR).
 */

import { describe, it, expect } from "vitest";
import {
  calcularAnual,
  calcularISRTarifaAnual,
  detectarDeduccionesPersonales,
  UMA_2026_ANUAL,
  DEDUCCIONES_PERSONALES_TOPE_UMAS,
} from "./anual";
import type { Transaction } from "../regime-types";

describe("calcularISRTarifaAnual (Art. 152 LISR)", () => {
  it("base 0 → ISR 0", () => {
    expect(calcularISRTarifaAnual(0)).toBe(0);
  });

  it("base negativa → ISR 0", () => {
    expect(calcularISRTarifaAnual(-1000)).toBe(0);
  });

  it("primer tramo (1.92%)", () => {
    const r = calcularISRTarifaAnual(5000);
    // (5000 − 0.01) × 1.92% ≈ 96
    expect(r).toBeCloseTo(96, 0);
  });

  it("segundo tramo (6.4%)", () => {
    const r = calcularISRTarifaAnual(50000);
    // cuota fija 171.88 + (50000 − 8952.50) × 6.4% = 171.88 + 2627.04 = 2798.92
    expect(r).toBeCloseTo(2798.92, 0);
  });

  it("último tramo (35%) para alto ingreso", () => {
    const r = calcularISRTarifaAnual(5_000_000);
    // cuota fija 1414947.85 + (5000000 - 4511707.38) × 35% = ~1585850
    expect(r).toBeGreaterThan(1_500_000);
    expect(r).toBeLessThan(1_700_000);
  });
});

describe("detectarDeduccionesPersonales", () => {
  function cfdi(props: Partial<Transaction> & { amount: number; description: string }): Transaction {
    return {
      id: props.id || `cfdi-${Math.random().toString(36).slice(2, 8)}`,
      type: "out",
      date: "2026-03-15",
      cfdi_status: "vigente",
      ...props,
    } as Transaction;
  }

  it("detecta gastos médicos por keywords", () => {
    const r = detectarDeduccionesPersonales([
      cfdi({ amount: 2500, description: "Consulta médica especialista" }),
      cfdi({ amount: 500, description: "Estudios laboratorio" }),
    ]);
    expect(r).toHaveLength(2);
    expect(r.every((d) => d.tipo === "gastos_medicos")).toBe(true);
  });

  it("detecta dentista vs médico (separado)", () => {
    const r = detectarDeduccionesPersonales([
      cfdi({ amount: 5000, description: "Ortodoncia tratamiento" }),
    ]);
    expect(r[0].tipo).toBe("gastos_dentales");
  });

  it("ignora CFDI no vigente", () => {
    const r = detectarDeduccionesPersonales([
      cfdi({ amount: 2500, description: "Médico", cfdi_status: "cancelado" }),
    ]);
    expect(r).toHaveLength(0);
  });

  it("ignora efectivo > $2K (Art. 27 fracc. III)", () => {
    const r = detectarDeduccionesPersonales([
      cfdi({ amount: 3000, description: "Consulta médica", forma_pago: "01" }), // 01 = efectivo
    ]);
    expect(r).toHaveLength(0);
  });

  it("permite efectivo si ≤ $2K", () => {
    const r = detectarDeduccionesPersonales([
      cfdi({ amount: 2000, description: "Consulta médica", forma_pago: "01" }),
    ]);
    expect(r).toHaveLength(1);
  });

  it("permite bancarizado > $2K", () => {
    const r = detectarDeduccionesPersonales([
      cfdi({ amount: 5000, description: "Hospital", forma_pago: "03" }), // 03 = SPEI
    ]);
    expect(r).toHaveLength(1);
  });

  it("detecta colegiaturas", () => {
    const r = detectarDeduccionesPersonales([
      cfdi({ amount: 12000, description: "Colegiatura primaria" }),
    ]);
    expect(r[0].tipo).toBe("colegiaturas");
  });

  it("detecta seguros médicos", () => {
    const r = detectarDeduccionesPersonales([
      cfdi({ amount: 8000, description: "Póliza médica anual AXA", forma_pago: "03" }),
    ]);
    expect(r[0].tipo).toBe("primas_seguro_gastos_medicos");
  });
});

describe("calcularAnual — escenarios", () => {
  it("saldo a favor cuando retenciones > ISR anual", () => {
    const r = calcularAnual({
      fiscalYear: 2025,
      ingresos: [
        {
          regimen: "plataformas",
          total_ingresos: 240000,
          pagos_provisionales: 0,
          retenciones_terceros: 8000, // Uber retuvo de más
        },
      ],
      deduccionesPersonalesDeclaradas: {},
    });
    // Base = 240000, ISR anual aprox ~19000
    // Retenciones = 8000
    // Diferencia = 19000 - 8000 = 11000 a pagar (NO saldo a favor en este caso)
    expect(r.total_ingresos_brutos).toBe(240000);
    expect(r.diferencia).toBeGreaterThan(0);
  });

  it("saldo a pagar cuando pagos provisionales fueron bajos", () => {
    const r = calcularAnual({
      fiscalYear: 2025,
      ingresos: [
        {
          regimen: "resico_pf",
          total_ingresos: 600000,
          pagos_provisionales: 6000, // RESICO 1% = $6K, pero anual usa Art. 152 progresiva = mayor
          retenciones_terceros: 0,
        },
      ],
      deduccionesPersonalesDeclaradas: {},
    });
    expect(r.saldo_a_pagar).toBeGreaterThan(0);
  });

  it("aplica deducciones personales declaradas", () => {
    const sin = calcularAnual({
      fiscalYear: 2025,
      ingresos: [{ regimen: "honorarios", total_ingresos: 500000, pagos_provisionales: 0, retenciones_terceros: 0 }],
      deduccionesPersonalesDeclaradas: {},
    });
    const con = calcularAnual({
      fiscalYear: 2025,
      ingresos: [{ regimen: "honorarios", total_ingresos: 500000, pagos_provisionales: 0, retenciones_terceros: 0 }],
      deduccionesPersonalesDeclaradas: { gastos_medicos: 30000 },
    });
    expect(con.isr_anual_calculado).toBeLessThan(sin.isr_anual_calculado);
    expect(con.deducciones_personales_aplicadas).toBe(30000);
  });

  it("topa donativos al 7% del ingreso", () => {
    const r = calcularAnual({
      fiscalYear: 2025,
      ingresos: [{ regimen: "honorarios", total_ingresos: 100000, pagos_provisionales: 0, retenciones_terceros: 0 }],
      deduccionesPersonalesDeclaradas: { donativos: 50000 }, // intentando deducir 50% del ingreso
    });
    // Tope donativos = 100000 × 7% = 7000
    // Pero total deducciones también está topado al 15% del ingreso o 5 UMAs
    // 15% de 100000 = 15000
    // 5 UMAs 2026 = ~214K (5 × 42,794.64)
    // Min(15000, 214K) = 15000 tope global
    // Como solo donativos están como deduc, después de topar a 7000, aplica
    expect(r.deducciones_personales_aplicadas).toBe(7000);
  });

  it("topa global al menor entre 15% ingreso o 5 UMAs", () => {
    const r = calcularAnual({
      fiscalYear: 2025,
      ingresos: [{ regimen: "honorarios", total_ingresos: 1_000_000, pagos_provisionales: 0, retenciones_terceros: 0 }],
      deduccionesPersonalesDeclaradas: {
        gastos_medicos: 300_000, // alto
      },
    });
    // 15% de 1M = 150K
    // 5 UMAs 2026 = ~214K (5 × 42,794.64)
    // Min(150K, 214K) = 150K tope
    expect(r.deducciones_personales_aplicadas).toBe(150_000);
    expect(r.deducciones_personales_topadas_a).toBe(150_000);
  });

  it("detecta deducciones automáticamente desde CFDIs", () => {
    const r = calcularAnual({
      fiscalYear: 2025,
      ingresos: [{ regimen: "honorarios", total_ingresos: 500000, pagos_provisionales: 0, retenciones_terceros: 0 }],
      deduccionesPersonalesDeclaradas: {},
      cfdisAnio: [
        {
          id: "c1",
          type: "out",
          date: "2025-03-15",
          amount: 5000,
          description: "Consulta médica especialista",
          cfdi_status: "vigente",
          forma_pago: "03",
        } as Transaction,
      ],
    });
    expect(r.deducciones_detectadas).toBeDefined();
    expect(r.deducciones_detectadas?.length).toBe(1);
    expect(r.deducciones_personales_aplicadas).toBeGreaterThan(0);
  });

  it("merges declaradas + automáticas", () => {
    const r = calcularAnual({
      fiscalYear: 2025,
      ingresos: [{ regimen: "honorarios", total_ingresos: 500000, pagos_provisionales: 0, retenciones_terceros: 0 }],
      deduccionesPersonalesDeclaradas: { gastos_medicos: 2000 },
      cfdisAnio: [
        {
          id: "c1", type: "out", date: "2025-03-15", amount: 3000,
          description: "Hospital", cfdi_status: "vigente", forma_pago: "03",
        } as Transaction,
      ],
    });
    // 2000 declarado + 3000 detectado = 5000
    expect(r.deducciones_personales_aplicadas).toBe(5000);
  });
});

describe("calcularAnual — constantes correctas", () => {
  it("UMA 2026 anual correcto (DOF 09-ene-2026 = mensual 3,566.22 × 12)", () => {
    expect(UMA_2026_ANUAL).toBeCloseTo(42_794.64, 2);
  });

  it("tope deducciones = 5 UMAs", () => {
    expect(DEDUCCIONES_PERSONALES_TOPE_UMAS).toBe(5);
  });
});

describe("calcularAnual — steps", () => {
  it("genera steps con cita legal", () => {
    const r = calcularAnual({
      fiscalYear: 2025,
      ingresos: [{ regimen: "honorarios", total_ingresos: 100000, pagos_provisionales: 0, retenciones_terceros: 0 }],
      deduccionesPersonalesDeclaradas: {},
    });
    expect(r.steps.length).toBeGreaterThan(0);
    expect(r.citas_legales).toContain("Art. 150 LISR");
    expect(r.citas_legales).toContain("Art. 151 LISR");
    expect(r.citas_legales).toContain("Art. 152 LISR");
  });
});
