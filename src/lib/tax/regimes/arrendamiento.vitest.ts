/**
 * Tests motor Arrendamiento (Cap. III LISR).
 */

import { describe, it, expect } from "vitest";
import { arrendamientoEngine, compararOpciones, ARRENDAMIENTO_DEDUCCION_CIEGA } from "./arrendamiento";
import type { Transaction } from "../regime-types";

const PERIOD = "2026-05";

function tx(props: Partial<Transaction> & { amount: number }): Transaction {
  return {
    id: props.id || `tx-${Math.random().toString(36).slice(2, 8)}`,
    type: "in",
    date: "2026-05-15",
    ...props,
  } as Transaction;
}

describe("arrendamientoEngine — deducción ciega vs real", () => {
  it("usa deducción ciega cuando no hay gastos comprobados", () => {
    const r = arrendamientoEngine.calculate(
      [tx({ amount: 18000 })],
      PERIOD,
    );
    expect(r.regime).toBe("arrendamiento");
    expect(r.ingresos_brutos).toBe(18000);
    // 18000 × 65% = 11700 base gravable
    expect(r.base_gravable).toBe(11700);
    expect(r.deducciones_aplicadas).toBe(6300); // 35%
  });

  it("recomienda gastos reales si son mayores al 35%", () => {
    const r = arrendamientoEngine.calculate(
      [
        tx({ amount: 18000 }),
        tx({ id: "g1", amount: 10000, type: "out", cfdi_status: "vigente", date: "2026-05-10" }), // gasto > 35% del ingreso
      ],
      PERIOD,
    );
    // Gastos reales = 10000, deducción ciega = 6300 → reales convierte
    expect(r.deducciones_aplicadas).toBe(10000);
    expect(r.base_gravable).toBe(8000);
  });

  it("ignora gastos sin CFDI vigente", () => {
    const r = arrendamientoEngine.calculate(
      [
        tx({ amount: 18000 }),
        tx({ id: "g1", amount: 10000, type: "out", cfdi_status: "cancelado", date: "2026-05-10" }),
        tx({ id: "g2", amount: 5000, type: "out", date: "2026-05-10" }), // sin status
      ],
      PERIOD,
    );
    // Solo gastos vigentes/timbrados cuentan. Aquí ninguno → cae a ciega
    expect(r.deducciones_aplicadas).toBe(6300);
  });

  it("opcionForzada respeta la elección del user", () => {
    const r = arrendamientoEngine.calculate(
      [
        tx({ amount: 18000 }),
        tx({ id: "g1", amount: 10000, type: "out", cfdi_status: "vigente", date: "2026-05-10" }),
      ],
      PERIOD,
      { opcionForzada: "DEDUCCION_CIEGA" } as any,
    );
    expect(r.deducciones_aplicadas).toBe(6300); // forzado a ciega aunque real era mejor
  });
});

describe("arrendamientoEngine — IVA", () => {
  it("casa habitación exenta de IVA", () => {
    const r = arrendamientoEngine.calculate(
      [tx({ amount: 20000 })],
      PERIOD,
      { uso: "HABITACIONAL" } as any,
    );
    expect(r.iva_trasladado).toBe(0);
    expect(r.citas_legales).toContain("Art. 9 fracc. II LIVA");
  });

  it("local comercial paga IVA 16%", () => {
    const r = arrendamientoEngine.calculate(
      [tx({ amount: 20000 })],
      PERIOD,
      { uso: "COMERCIAL" } as any,
    );
    expect(r.iva_trasladado).toBe(3200);
    expect(r.citas_legales).toContain("Art. 1 LIVA");
  });

  it("frontera norte: comercial paga IVA 8%", () => {
    const r = arrendamientoEngine.calculate(
      [tx({ amount: 20000 })],
      PERIOD,
      { uso: "COMERCIAL", fronteraNorte: true } as any,
    );
    expect(r.iva_trasladado).toBe(1600);
  });

  it("temporal turístico (Airbnb corto plazo) paga IVA", () => {
    const r = arrendamientoEngine.calculate(
      [tx({ amount: 10000 })],
      PERIOD,
      { uso: "TEMPORAL_TURISTICO" } as any,
    );
    expect(r.iva_trasladado).toBe(1600);
  });
});

describe("arrendamientoEngine — edge cases", () => {
  it("mes sin pagos retorna estructura vacía", () => {
    const r = arrendamientoEngine.calculate([], PERIOD);
    expect(r.ingresos_brutos).toBe(0);
    expect(r.warnings?.length).toBeGreaterThan(0);
  });

  it("ingresos brutos no incluyen pagos fuera del periodo", () => {
    const r = arrendamientoEngine.calculate(
      [
        tx({ amount: 18000, date: "2026-04-15" }),
        tx({ amount: 18000, date: "2026-05-15" }),
      ],
      PERIOD,
    );
    expect(r.ingresos_brutos).toBe(18000);
  });

  it("base_gravable no puede ser negativa", () => {
    const r = arrendamientoEngine.calculate(
      [
        tx({ amount: 5000 }),
        tx({ id: "g1", amount: 100000, type: "out", cfdi_status: "vigente", date: "2026-05-10" }),
      ],
      PERIOD,
    );
    expect(r.base_gravable).toBeGreaterThanOrEqual(0);
  });

  it("total_a_pagar = isr + iva", () => {
    const r = arrendamientoEngine.calculate(
      [tx({ amount: 20000 })],
      PERIOD,
      { uso: "COMERCIAL" } as any,
    );
    expect(r.total_a_pagar).toBe(r.isr_a_pagar + r.iva_a_pagar);
  });
});

describe("compararOpciones helper", () => {
  it("recomienda real si gastos > 35% del ingreso", () => {
    const c = compararOpciones(10000, 5000); // gastos 50%, ciega = 6500
    expect(c.recomendada).toBe("DEDUCCIONES_REALES");
    expect(c.real.base).toBe(5000);
    expect(c.ciega.base).toBe(6500);
  });

  it("recomienda ciega si gastos < 35% del ingreso", () => {
    const c = compararOpciones(10000, 2000); // gastos 20%, ciega = 6500 < real = 8000
    expect(c.recomendada).toBe("DEDUCCION_CIEGA");
  });

  it("boundary exacto 35% — la ciega gana por empate", () => {
    const c = compararOpciones(10000, 3500); // gastos = 35%, base_real = 6500 = base_ciega
    // baseReal < baseCiega es false → recomienda ciega
    expect(c.recomendada).toBe("DEDUCCION_CIEGA");
  });

  it("constantes correctas", () => {
    expect(ARRENDAMIENTO_DEDUCCION_CIEGA).toBe(0.35);
  });
});
