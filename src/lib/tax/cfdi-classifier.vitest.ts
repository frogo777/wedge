/**
 * Tests classifier de CFDI por régimen.
 */

import { describe, it, expect } from "vitest";
import {
  classifyCfdiByRegime,
  isPlataformaCfdi,
  listPlataformasSupported,
  RFC_PLATAFORMAS,
} from "./cfdi-classifier";

describe("classifyCfdiByRegime — plataformas", () => {
  it("Uber se clasifica como plataforma TRANSPORTE", () => {
    const r = classifyCfdiByRegime({ emisor_rfc: "UBR130212LX1", type: "in" });
    expect(r.regimen).toBe("plataformas");
    expect(r.plataforma?.tipo).toBe("TRANSPORTE");
    expect(r.plataforma?.nombre).toBe("Uber");
    expect(r.plataforma?.retencion_isr).toBe(0.025);
  });

  it("Rappi se clasifica como plataforma ENTREGA", () => {
    const r = classifyCfdiByRegime({ emisor_rfc: "RAP180405XX0", type: "in" });
    expect(r.plataforma?.tipo).toBe("ENTREGA");
    expect(r.plataforma?.retencion_isr).toBe(0.021);
  });

  it("Airbnb se clasifica como HOSPEDAJE 4%", () => {
    const r = classifyCfdiByRegime({ emisor_rfc: "AIR170201XX0", type: "in" });
    expect(r.plataforma?.tipo).toBe("HOSPEDAJE");
    expect(r.plataforma?.retencion_isr).toBe(0.04);
  });

  it("MercadoLibre se clasifica como MARKETPLACE 4%", () => {
    const r = classifyCfdiByRegime({ emisor_rfc: "MLA980303XX0", type: "in" });
    expect(r.plataforma?.tipo).toBe("MARKETPLACE");
  });

  it("case-insensitive en RFC", () => {
    const r = classifyCfdiByRegime({ emisor_rfc: "ubr130212lx1", type: "in" });
    expect(r.regimen).toBe("plataformas");
  });

  it("trim de espacios en RFC", () => {
    const r = classifyCfdiByRegime({ emisor_rfc: "  UBR130212LX1  ", type: "in" });
    expect(r.regimen).toBe("plataformas");
  });
});

describe("classifyCfdiByRegime — plataformas foráneas", () => {
  it("Fiverr detectado por descripción", () => {
    const r = classifyCfdiByRegime({
      emisor_rfc: "XEXX010101000",
      type: "in",
      description: "Pago Fiverr international",
    });
    expect(r.regimen).toBe("plataformas");
    expect(r.plataforma?.tipo).toBe("OTRO");
    expect(r.plataforma?.retencion_isr).toBe(0); // foránea no retiene MX
  });

  it("Upwork detectado por descripción", () => {
    const r = classifyCfdiByRegime({
      emisor_rfc: "XEXX010101000",
      type: "in",
      description: "Upwork freelancer payment",
    });
    expect(r.plataforma?.tipo).toBe("OTRO");
  });
});

describe("classifyCfdiByRegime — no clasifica", () => {
  it("CFDI sin emisor_rfc retorna null", () => {
    const r = classifyCfdiByRegime({ type: "in" });
    expect(r.regimen).toBeNull();
  });

  it("CFDI type=out se ignora (es gasto, no ingreso)", () => {
    const r = classifyCfdiByRegime({ emisor_rfc: "UBR130212LX1", type: "out" });
    expect(r.regimen).toBeNull();
  });

  it("RFC desconocido + sin descripción → null", () => {
    const r = classifyCfdiByRegime({ emisor_rfc: "ABC123456ZZZ", type: "in" });
    expect(r.regimen).toBeNull();
  });

  it("RFC desconocido + descripción sin keywords → null", () => {
    const r = classifyCfdiByRegime({
      emisor_rfc: "ABC123456ZZZ",
      type: "in",
      description: "Servicios profesionales",
    });
    expect(r.regimen).toBeNull();
  });
});

describe("isPlataformaCfdi helper", () => {
  it("true para RFCs conocidos", () => {
    expect(isPlataformaCfdi("UBR130212LX1")).toBe(true);
    expect(isPlataformaCfdi("RAP180405XX0")).toBe(true);
  });

  it("false para RFC desconocido", () => {
    expect(isPlataformaCfdi("ABC123456ZZZ")).toBe(false);
  });

  it("false para input vacío", () => {
    expect(isPlataformaCfdi(null)).toBe(false);
    expect(isPlataformaCfdi(undefined)).toBe(false);
    expect(isPlataformaCfdi("")).toBe(false);
  });
});

describe("listPlataformasSupported", () => {
  it("dedupe by nombre (DiDi tiene 2 RFCs pero aparece 1 vez)", () => {
    const list = listPlataformasSupported();
    const didiCount = list.filter((p) => p.nombre === "DiDi").length;
    expect(didiCount).toBe(1);
  });

  it("incluye al menos 7 plataformas distintas", () => {
    const list = listPlataformasSupported();
    expect(list.length).toBeGreaterThanOrEqual(7);
  });

  it("incluye Uber, Rappi, Airbnb, MercadoLibre", () => {
    const names = listPlataformasSupported().map((p) => p.nombre);
    expect(names).toContain("Uber");
    expect(names).toContain("Rappi");
    expect(names).toContain("Airbnb");
    expect(names).toContain("MercadoLibre");
  });
});

describe("RFC_PLATAFORMAS — sanity check", () => {
  it("toda entry tiene los campos requeridos", () => {
    for (const [rfc, info] of Object.entries(RFC_PLATAFORMAS)) {
      expect(rfc.length, `${rfc} formato`).toBeGreaterThanOrEqual(12);
      expect(info.nombre, `${rfc}.nombre`).toBeTruthy();
      expect(info.tipo, `${rfc}.tipo`).toBeTruthy();
      expect(info.retencion_isr, `${rfc}.retencion_isr`).toBeGreaterThanOrEqual(0);
      expect(info.retencion_iva, `${rfc}.retencion_iva`).toBeGreaterThanOrEqual(0);
    }
  });

  it("tasas coinciden con Art. 113-A LISR", () => {
    for (const info of Object.values(RFC_PLATAFORMAS)) {
      switch (info.tipo) {
        case "TRANSPORTE": expect(info.retencion_isr).toBe(0.025); break;
        case "ENTREGA":    expect(info.retencion_isr).toBe(0.021); break;
        case "HOSPEDAJE":  expect(info.retencion_isr).toBe(0.04); break;
        case "MARKETPLACE": expect(info.retencion_isr).toBe(0.04); break;
      }
    }
  });
});
