/**
 * Edge-case fiscal tests — valida que buildMonthlyDeclaration calcule
 * correctamente los 6 escenarios reales mexicanos. Si alguno falla,
 * wedge NO puede abrir Wave 2 hasta arreglarlo.
 */

import { describe, it, expect } from "vitest";
import { buildMonthlyDeclaration } from "./resico";
import { ALL_FIXTURES } from "./__fixtures__/edge-cases";

const TOLERANCE = 0.5; // pesos — redondeo aceptable

describe("Edge cases fiscales 2026 (Wave 2 readiness)", () => {
  for (const fixture of ALL_FIXTURES) {
    describe(fixture.name, () => {
      const result = buildMonthlyDeclaration(fixture.txs, fixture.periodo);

      it(`ingresos cobrados match (${fixture.cite})`, () => {
        expect(result.ingresosCobrados).toBeCloseTo(
          fixture.expected.ingresosCobrados,
          1
        );
      });

      it("IVA trasladado match", () => {
        expect(result.ivaTrasladado).toBeCloseTo(
          fixture.expected.ivaTrasladado,
          1
        );
      });

      it("IVA acreditable match", () => {
        expect(result.ivaAcreditable).toBeCloseTo(
          fixture.expected.ivaAcreditable,
          1
        );
      });

      it("ISR retenido match", () => {
        expect(result.isrRetenido).toBeCloseTo(
          fixture.expected.isrRetenido,
          1
        );
      });

      it("IVA retenido match", () => {
        expect(result.ivaRetenido).toBeCloseTo(
          fixture.expected.ivaRetenido,
          1
        );
      });

      it("ISR a pagar (post-retenciones) match", () => {
        const diff = Math.abs(result.isr.aPagar - fixture.expected.isrAPagar);
        expect(diff).toBeLessThanOrEqual(TOLERANCE);
      });

      it("Total a pagar al SAT match", () => {
        const diff = Math.abs(result.totalAPagar - fixture.expected.totalAPagar);
        expect(diff).toBeLessThanOrEqual(TOLERANCE);
      });
    });
  }
});
