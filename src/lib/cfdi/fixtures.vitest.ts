import { describe, it, expect } from "vitest";
import {
  getDemoCfdis, DEMO_USER_RFC,
  XML_INGRESO_PUE, XML_INGRESO_PUE_2, XML_GASTO_IVA, XML_INGRESO_RET_RESICO,
  XML_RETENCION_ISR_IVA, XML_INGRESO_CANCELADO, XML_INGRESO_PPD, XML_EGRESO, XML_PAGO_REP,
} from "./fixtures";

const ALL_XML = [
  XML_INGRESO_PUE, XML_INGRESO_PUE_2, XML_GASTO_IVA, XML_INGRESO_RET_RESICO,
  XML_RETENCION_ISR_IVA, XML_INGRESO_CANCELADO, XML_INGRESO_PPD, XML_EGRESO, XML_PAGO_REP,
].join("\n");

// RFCs REALES de plataformas que el clasificador conoce — NUNCA deben aparecer en fixtures.
const REAL_PLATFORM_RFCS = [
  "UBR130212LX1", "DCH180226BJ9", "DIM180917U22", "MAA130610RV1",
  "RAP180405XX0", "AIR170201XX0", "AIH960106LX9", "BCM151022XX0", "MLA980303XX0",
];

describe("cfdi/fixtures — seguridad de datos ficticios", () => {
  it("NO contienen RFCs reales de plataformas conocidas", () => {
    for (const rfc of REAL_PLATFORM_RFCS) {
      expect(ALL_XML).not.toContain(rfc);
    }
  });

  it("todos los UUID son placeholders sintéticos (no UUIDs reales de CFDI)", () => {
    const uuids = ALL_XML.match(/UUID="([^"]+)"/g) ?? [];
    expect(uuids.length).toBeGreaterThan(0);
    for (const u of uuids) {
      expect(u).toMatch(/UUID="00000000-0000-4000-8000-0000000000\d{2}"/);
    }
  });

  it("nombres son claramente ficticios (Demo/Ficticio/Demostracion)", () => {
    const nombres = ALL_XML.match(/Nombre="([^"]+)"/g) ?? [];
    expect(nombres.length).toBeGreaterThan(0);
    for (const n of nombres) {
      expect(/Demo|Ficticio|Demostracion/i.test(n)).toBe(true);
    }
  });

  it("el set demo normalizado ENMASCARA el RFC del usuario (privacidad)", () => {
    const json = JSON.stringify(getDemoCfdis());
    expect(json).not.toContain(DEMO_USER_RFC); // RFC completo no se expone
    expect(json).toContain("DEM******B1");     // versión enmascarada sí
  });

  it("getDemoCfdis devuelve 7 CFDIs con uno cancelado y uno PPD pendiente", () => {
    const demo = getDemoCfdis();
    expect(demo).toHaveLength(7);
    expect(demo.filter((c) => c.status === "cancelado")).toHaveLength(1);
    expect(demo.filter((c) => c.status === "pendienteComplemento")).toHaveLength(1);
    expect(demo.every((c) => c.source === "fixture")).toBe(true);
  });
});
