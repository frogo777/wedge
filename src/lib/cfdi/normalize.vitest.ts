import { describe, it, expect } from "vitest";
import { parseOne } from "./parse";
import { normalizeCfdi, maskRfc, periodFromIso } from "./normalize";
import {
  XML_INGRESO_PUE, XML_RETENCION_ISR_IVA, XML_GASTO_IVA, XML_INGRESO_PPD, DEMO_USER_RFC,
} from "./fixtures";

function norm(xml: string, meta?: Parameters<typeof normalizeCfdi>[1]) {
  const r = parseOne(xml);
  if (!r.ok) throw new Error(r.error);
  return normalizeCfdi(r.cfdi, { userRfc: DEMO_USER_RFC, source: "fixture", ...meta });
}

describe("cfdi/normalize", () => {
  it("normaliza impuestos: detecta IVA trasladado", () => {
    const c = norm(XML_INGRESO_PUE);
    expect(c.taxes.ivaTrasladado).toBe(2880);
    expect(c.taxes.isrRetenido).toBe(0);
    expect(c.subtotal).toBe(18000);
    expect(c.monthKey).toBe("2026-06");
    expect(c.type).toBe("ingreso");
    expect(c.direction).toBe("emitido");
  });

  it("detecta retención ISR e IVA", () => {
    const c = norm(XML_RETENCION_ISR_IVA);
    expect(c.taxes.isrRetenido).toBe(2000);
    expect(c.taxes.ivaRetenido).toBeCloseTo(2133.33, 2);
    expect(c.taxes.ivaTrasladado).toBe(3200);
  });

  it("enmascara RFCs (privacidad) — no expone el RFC completo", () => {
    const c = norm(XML_GASTO_IVA);
    expect(c.issuerRfcMasked).not.toContain("PRO010101CD3");
    expect(c.receiverRfcMasked).not.toContain(DEMO_USER_RFC);
    expect(c.issuerRfcMasked).toContain("*");
  });

  it("PPD sin complemento → warnings y monthKey desde fecha", () => {
    const c = norm(XML_INGRESO_PPD, { meta: { hasComplementoPago: false } });
    expect(c.paymentMethod).toBe("PPD");
    expect(c.monthKey).toBe("2026-06");
  });

  it("helpers: maskRfc y periodFromIso", () => {
    expect(maskRfc("DEMO010101AB1")).toBe("DEM******B1");
    expect(maskRfc("")).toBe("—");
    expect(periodFromIso("2026-06-22T10:05:00")).toBe("2026-06");
    expect(periodFromIso("basura")).toBe("");
  });
});
