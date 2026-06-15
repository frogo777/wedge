/**
 * Tests motor Plataformas Digitales (Art. 113-A LISR).
 *
 * Cobertura:
 *   - Solo Uber: cálculo correcto con 2.5%
 *   - Solo Rappi: 2.1%
 *   - Solo Airbnb: 4.0%
 *   - Uber + Rappi mixto: tasas separadas por plataforma
 *   - Retenciones presentes vs ausentes
 *   - Frontera norte: IVA 8%
 *   - Mes sin ingresos: estado vacío correcto
 *   - Opción Art. 113-B definitiva: umbral $300K
 *   - IVA retenido por plataforma (8%)
 *   - Warnings cuando hay ingresos sin retención
 */

import { describe, it, expect } from "vitest";
import { plataformasEngine, calificaOpcionDefinitiva, PLATAFORMAS_OPCION_DEFINITIVA_LIMITE_ANUAL } from "./plataformas";
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

describe("plataformasEngine — TRANSPORTE (Uber/DiDi 2.5%)", () => {
  it("calcula ISR correcto sobre ingresos Uber sin retención", () => {
    const r = plataformasEngine.calculate(
      [tx({ amount: 10000, emisor_rfc: "UBR130212LX1" })],
      PERIOD,
    );
    expect(r.regime).toBe("plataformas");
    expect(r.ingresos_brutos).toBe(10000);
    expect(r.isr_calculado).toBe(250); // 10000 × 2.5%
    expect(r.isr_retenido).toBe(0);
    expect(r.isr_a_pagar).toBe(250);
    expect(r.warnings?.length).toBeGreaterThan(0); // alerta sin retención
  });

  it("acredita retención correcta de Uber", () => {
    const r = plataformasEngine.calculate(
      [tx({ amount: 10000, emisor_rfc: "UBR130212LX1", isr_retenido: 250, iva_retenido: 800 })],
      PERIOD,
    );
    expect(r.isr_calculado).toBe(250);
    expect(r.isr_retenido).toBe(250);
    expect(r.isr_a_pagar).toBe(0); // ya retenido todo
    expect(r.iva_retenido).toBe(800);
  });

  it("DiDi se trata igual que Uber (mismo tipo TRANSPORTE)", () => {
    const r = plataformasEngine.calculate(
      [tx({ amount: 5000, emisor_rfc: "DCH180226BJ9", isr_retenido: 125 })],
      PERIOD,
    );
    expect(r.isr_calculado).toBe(125); // 5000 × 2.5%
    expect(r.isr_a_pagar).toBe(0);
  });
});

describe("plataformasEngine — ENTREGA (Rappi 2.1%)", () => {
  it("aplica 2.1% para Rappi (no 2.5%)", () => {
    const r = plataformasEngine.calculate(
      [tx({ amount: 8000, emisor_rfc: "RAP180405XX0" })],
      PERIOD,
    );
    expect(r.isr_calculado).toBe(168); // 8000 × 2.1%
  });
});

describe("plataformasEngine — HOSPEDAJE (Airbnb 4%)", () => {
  it("Airbnb aplica 4%", () => {
    const r = plataformasEngine.calculate(
      [tx({ amount: 20000, emisor_rfc: "AIR170201XX0", isr_retenido: 800 })],
      PERIOD,
    );
    expect(r.isr_calculado).toBe(800); // 20000 × 4%
    expect(r.isr_a_pagar).toBe(0);
  });
});

describe("plataformasEngine — MARKETPLACE (MercadoLibre 4%)", () => {
  it("MercadoLibre aplica 4%", () => {
    const r = plataformasEngine.calculate(
      [tx({ amount: 15000, emisor_rfc: "MLA980303XX0" })],
      PERIOD,
    );
    expect(r.isr_calculado).toBe(600); // 15000 × 4%
  });
});

describe("plataformasEngine — múltiples plataformas mixtas", () => {
  it("calcula tasas distintas por plataforma en mismo mes", () => {
    const r = plataformasEngine.calculate(
      [
        tx({ id: "u1", amount: 12000, emisor_rfc: "UBR130212LX1", isr_retenido: 300 }),
        tx({ id: "r1", amount: 8500,  emisor_rfc: "RAP180405XX0", isr_retenido: 178.5 }),
      ],
      PERIOD,
    );
    expect(r.ingresos_brutos).toBe(20500);
    // ISR teórico = 12000×2.5% + 8500×2.1% = 300 + 178.5 = 478.5
    expect(r.isr_calculado).toBe(478.5);
    expect(r.isr_retenido).toBe(478.5);
    expect(r.isr_a_pagar).toBe(0); // todo retenido
  });

  it("agrupa múltiples transacciones de la misma plataforma", () => {
    const r = plataformasEngine.calculate(
      [
        tx({ id: "u1", amount: 5000, emisor_rfc: "UBR130212LX1" }),
        tx({ id: "u2", amount: 5000, emisor_rfc: "UBR130212LX1" }),
        tx({ id: "u3", amount: 5000, emisor_rfc: "UBR130212LX1" }),
      ],
      PERIOD,
    );
    expect(r.ingresos_brutos).toBe(15000);
    expect(r.isr_calculado).toBe(375); // 15000 × 2.5%
  });
});

describe("plataformasEngine — IVA", () => {
  it("IVA trasladado 16% por default", () => {
    const r = plataformasEngine.calculate(
      [tx({ amount: 10000, emisor_rfc: "UBR130212LX1" })],
      PERIOD,
    );
    expect(r.iva_trasladado).toBe(1600); // 16%
  });

  it("IVA trasladado 8% en frontera norte", () => {
    const r = plataformasEngine.calculate(
      [tx({ amount: 10000, emisor_rfc: "UBR130212LX1" })],
      PERIOD,
      { fronteraNorte: true },
    );
    expect(r.iva_trasladado).toBe(800); // 8%
  });

  it("IVA acreditable se descuenta del trasladado", () => {
    const r = plataformasEngine.calculate(
      [
        tx({ amount: 10000, emisor_rfc: "UBR130212LX1" }),
        tx({ id: "g1", amount: 1000, type: "out", iva_acreditable: 160, emisor_rfc: "OXX970814HS9", date: "2026-05-10" }),
      ],
      PERIOD,
    );
    expect(r.iva_acreditable).toBe(160);
    expect(r.iva_a_pagar).toBe(1440); // 1600 − 160
  });
});

describe("plataformasEngine — edge cases", () => {
  it("mes sin ingresos retorna estructura vacía sin throw", () => {
    const r = plataformasEngine.calculate([], PERIOD);
    expect(r.ingresos_brutos).toBe(0);
    expect(r.total_a_pagar).toBe(0);
    expect(r.warnings?.length).toBeGreaterThan(0);
  });

  it("CFDI sin emisor_rfc se ignora (no se clasifica)", () => {
    const r = plataformasEngine.calculate(
      [tx({ amount: 5000 })], // sin emisor_rfc
      PERIOD,
    );
    expect(r.ingresos_brutos).toBe(0);
  });

  it("CFDI con RFC desconocido se ignora", () => {
    const r = plataformasEngine.calculate(
      [tx({ amount: 5000, emisor_rfc: "ABC123456789" })],
      PERIOD,
    );
    expect(r.ingresos_brutos).toBe(0);
  });

  it("CFDI de mes distinto al period se ignora", () => {
    const r = plataformasEngine.calculate(
      [
        tx({ amount: 5000, emisor_rfc: "UBR130212LX1", date: "2026-04-15" }),
        tx({ amount: 5000, emisor_rfc: "UBR130212LX1", date: "2026-05-15" }),
      ],
      PERIOD, // mayo
    );
    expect(r.ingresos_brutos).toBe(5000); // solo el de mayo
  });

  it("type=out se ignora en clasificación (no es ingreso)", () => {
    const r = plataformasEngine.calculate(
      [tx({ amount: 5000, emisor_rfc: "UBR130212LX1", type: "out" })],
      PERIOD,
    );
    expect(r.ingresos_brutos).toBe(0);
  });

  it("retornar steps con cita legal Art. 113-A", () => {
    const r = plataformasEngine.calculate(
      [tx({ amount: 10000, emisor_rfc: "UBR130212LX1" })],
      PERIOD,
    );
    expect(r.citas_legales).toContain("Art. 113-A LISR");
    expect(r.steps.some((s) => s.citaLegal === "Art. 113-A LISR")).toBe(true);
  });
});

describe("calificaOpcionDefinitiva (Art. 113-B LISR)", () => {
  it("umbral está en $300K anuales", () => {
    expect(PLATAFORMAS_OPCION_DEFINITIVA_LIMITE_ANUAL).toBe(300_000);
  });

  it("ingresos < $300K → califica para definitiva", () => {
    expect(calificaOpcionDefinitiva(200_000)).toBe(true);
    expect(calificaOpcionDefinitiva(299_999)).toBe(true);
    expect(calificaOpcionDefinitiva(300_000)).toBe(true); // boundary inclusivo
  });

  it("ingresos > $300K → NO califica (declaración mensual obligatoria)", () => {
    expect(calificaOpcionDefinitiva(300_001)).toBe(false);
    expect(calificaOpcionDefinitiva(500_000)).toBe(false);
  });
});

describe("plataformasEngine — totales correctos", () => {
  it("total_a_pagar = isr_a_pagar + iva_a_pagar", () => {
    const r = plataformasEngine.calculate(
      [tx({ amount: 10000, emisor_rfc: "UBR130212LX1", isr_retenido: 100 })],
      PERIOD,
    );
    expect(r.total_a_pagar).toBe(r.isr_a_pagar + r.iva_a_pagar);
  });

  it("isr_a_pagar nunca es negativo (cap en 0)", () => {
    // Si plataforma retuvo de más, no se devuelve en mensual — saldo a favor anual
    const r = plataformasEngine.calculate(
      [tx({ amount: 10000, emisor_rfc: "UBR130212LX1", isr_retenido: 999 })],
      PERIOD,
    );
    expect(r.isr_a_pagar).toBe(0);
    expect(r.isr_a_pagar).not.toBeLessThan(0);
  });
});
