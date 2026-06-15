/**
 * Tests para validadores fiscales compartidos.
 *
 * Cubre:
 *   - isValidIsoDate: rechazar fechas imposibles (31-feb, mes 13, etc.)
 *   - normalizeCfdiStatus: robusto a casing/whitespace
 *   - isCancelledCfdi / isVigenteCfdi: handling de variantes SAT
 *   - isFormaPagoDeducible: Art. 27 fracc. III LISR ($2K cash threshold)
 *
 * Estos validadores son load-bearing para math fiscal — un bug aquí
 * afecta IVA acreditable, deducciones, y resultado de declaraciones.
 */

import { describe, it, expect } from "vitest";
import {
  isValidIsoDate,
  normalizeCfdiStatus,
  isCancelledCfdi,
  isVigenteCfdi,
  isFormaPagoDeducible,
} from "./validators";

describe("isValidIsoDate", () => {
  it("acepta fechas válidas estándar", () => {
    expect(isValidIsoDate("2026-05-26")).toBe(true);
    expect(isValidIsoDate("2024-02-29")).toBe(true); // bisiesto
    expect(isValidIsoDate("2026-01-01")).toBe(true);
    expect(isValidIsoDate("2026-12-31")).toBe(true);
  });

  it("rechaza febrero 29 en años no bisiestos", () => {
    expect(isValidIsoDate("2025-02-29")).toBe(false);
    expect(isValidIsoDate("2023-02-29")).toBe(false);
  });

  it("rechaza febrero 30/31 siempre", () => {
    expect(isValidIsoDate("2024-02-30")).toBe(false);
    expect(isValidIsoDate("2024-02-31")).toBe(false);
  });

  it("rechaza día 31 en meses de 30 días", () => {
    expect(isValidIsoDate("2026-04-31")).toBe(false);
    expect(isValidIsoDate("2026-06-31")).toBe(false);
    expect(isValidIsoDate("2026-09-31")).toBe(false);
    expect(isValidIsoDate("2026-11-31")).toBe(false);
  });

  it("rechaza mes inválido", () => {
    expect(isValidIsoDate("2026-00-15")).toBe(false);
    expect(isValidIsoDate("2026-13-15")).toBe(false);
    expect(isValidIsoDate("2026-99-15")).toBe(false);
  });

  it("rechaza día inválido", () => {
    expect(isValidIsoDate("2026-05-00")).toBe(false);
    expect(isValidIsoDate("2026-05-32")).toBe(false);
    expect(isValidIsoDate("2026-05-99")).toBe(false);
  });

  it("rechaza año fuera de rango sanity", () => {
    expect(isValidIsoDate("1899-12-31")).toBe(false);
    expect(isValidIsoDate("2201-01-01")).toBe(false);
  });

  it("rechaza formato incorrecto", () => {
    expect(isValidIsoDate("2026/05/26")).toBe(false);
    expect(isValidIsoDate("26-05-2026")).toBe(false);
    expect(isValidIsoDate("2026-5-26")).toBe(false); // necesita 2 dígitos
    expect(isValidIsoDate("2026-05")).toBe(false);
    expect(isValidIsoDate("")).toBe(false);
  });

  it("rechaza non-string inputs (type guard)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isValidIsoDate(20260526 as any)).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isValidIsoDate(null as any)).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isValidIsoDate(undefined as any)).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isValidIsoDate({} as any)).toBe(false);
  });

  it("acepta bisiestos centenarios divisibles por 400", () => {
    expect(isValidIsoDate("2000-02-29")).toBe(true);  // bisiesto
    expect(isValidIsoDate("1900-02-29")).toBe(false); // NO bisiesto (regla 100)
    expect(isValidIsoDate("2100-02-29")).toBe(false); // NO bisiesto
  });
});

describe("normalizeCfdiStatus", () => {
  it("trim y lowercase", () => {
    expect(normalizeCfdiStatus("  Cancelado  ")).toBe("cancelado");
    expect(normalizeCfdiStatus("VIGENTE")).toBe("vigente");
    expect(normalizeCfdiStatus("Timbrado")).toBe("timbrado");
  });

  it("retorna string vacío para non-string", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(normalizeCfdiStatus(null as any)).toBe("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(normalizeCfdiStatus(undefined as any)).toBe("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(normalizeCfdiStatus(123 as any)).toBe("");
  });
});

describe("isCancelledCfdi", () => {
  it("matchea variantes de casing/whitespace", () => {
    expect(isCancelledCfdi({ cfdi_status: "cancelado" })).toBe(true);
    expect(isCancelledCfdi({ cfdi_status: "Cancelado" })).toBe(true);
    expect(isCancelledCfdi({ cfdi_status: "CANCELADO" })).toBe(true);
    expect(isCancelledCfdi({ cfdi_status: "  cancelado  " })).toBe(true);
  });

  it("retorna false para vigente/timbrado/null", () => {
    expect(isCancelledCfdi({ cfdi_status: "vigente" })).toBe(false);
    expect(isCancelledCfdi({ cfdi_status: "timbrado" })).toBe(false);
    expect(isCancelledCfdi({ cfdi_status: null })).toBe(false);
    expect(isCancelledCfdi({})).toBe(false);
  });
});

describe("isVigenteCfdi", () => {
  it("acepta vigente Y timbrado (legacy/belvo compatibility)", () => {
    expect(isVigenteCfdi({ cfdi_status: "vigente" })).toBe(true);
    expect(isVigenteCfdi({ cfdi_status: "Vigente" })).toBe(true);
    expect(isVigenteCfdi({ cfdi_status: "timbrado" })).toBe(true);
    expect(isVigenteCfdi({ cfdi_status: "Timbrado" })).toBe(true);
  });

  it("retorna false para cancelado/desconocido", () => {
    expect(isVigenteCfdi({ cfdi_status: "cancelado" })).toBe(false);
    expect(isVigenteCfdi({ cfdi_status: "pendiente" })).toBe(false);
    expect(isVigenteCfdi({ cfdi_status: null })).toBe(false);
    expect(isVigenteCfdi({})).toBe(false);
  });
});

describe("isFormaPagoDeducible (Art. 27 fracc. III LISR)", () => {
  it("monto ≤ $2,000 siempre deducible (regla no aplica)", () => {
    expect(isFormaPagoDeducible({ amount: 100, forma_pago: "01" })).toBe(true); // efectivo OK
    expect(isFormaPagoDeducible({ amount: 2000, forma_pago: "01" })).toBe(true); // boundary
    expect(isFormaPagoDeducible({ amount: 0, forma_pago: null })).toBe(true);
  });

  it("monto > $2,000 con forma bancarizada → deducible", () => {
    expect(isFormaPagoDeducible({ amount: 5000, forma_pago: "02" })).toBe(true); // cheque
    expect(isFormaPagoDeducible({ amount: 5000, forma_pago: "03" })).toBe(true); // SPEI
    expect(isFormaPagoDeducible({ amount: 5000, forma_pago: "04" })).toBe(true); // TC
    expect(isFormaPagoDeducible({ amount: 5000, forma_pago: "28" })).toBe(true); // TD
  });

  it("monto > $2,000 con efectivo (01) → NO deducible", () => {
    expect(isFormaPagoDeducible({ amount: 2001, forma_pago: "01" })).toBe(false);
    expect(isFormaPagoDeducible({ amount: 10000, forma_pago: "01" })).toBe(false);
  });

  it("monto > $2,000 con vales (08) → NO deducible", () => {
    expect(isFormaPagoDeducible({ amount: 3000, forma_pago: "08" })).toBe(false);
  });

  it("forma_pago desconocida + monto > $2K → asume bancarizado (UX permisivo)", () => {
    expect(isFormaPagoDeducible({ amount: 5000, forma_pago: null })).toBe(true);
    expect(isFormaPagoDeducible({ amount: 5000, forma_pago: "" })).toBe(true);
    expect(isFormaPagoDeducible({ amount: 5000 })).toBe(true);
  });

  it("amount null/undefined tratado como 0 (siempre deducible)", () => {
    expect(isFormaPagoDeducible({ amount: null, forma_pago: "01" })).toBe(true);
    expect(isFormaPagoDeducible({ forma_pago: "01" })).toBe(true);
  });
});
