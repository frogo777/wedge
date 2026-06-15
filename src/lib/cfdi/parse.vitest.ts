import { describe, it, expect } from "vitest";
import { parseOne, parseMany, parseBatch } from "./parse";
import { XML_INGRESO_PUE } from "./fixtures";

describe("cfdi/parse", () => {
  it("parsea un XML de ingreso ficticio", () => {
    const r = parseOne(XML_INGRESO_PUE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.cfdi.version).toBe("4.0");
      expect(r.cfdi.tipoDeComprobante).toBe("I");
      expect(r.cfdi.subTotal).toBe(18000);
      expect(r.cfdi.impuestos?.totalIVA).toBe(2880);
      expect(r.cfdi.timbre?.uuid).toBe("00000000-0000-4000-8000-000000000001");
    }
  });

  it("falla seguro con XML inválido (no lanza)", () => {
    expect(parseOne("esto no es xml").ok).toBe(false);
    expect(parseOne("").ok).toBe(false);
    expect(parseOne("<html><body>nope</body></html>").ok).toBe(false);
  });

  it("falla seguro con CFDI 3.3 (no soportado)", () => {
    const v33 = `<?xml version="1.0"?><cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/3" Version="3.3" Fecha="2026-06-01T00:00:00" SubTotal="100" Total="116"><cfdi:Emisor Rfc="DEMO010101AB1"/><cfdi:Receptor Rfc="EMP010101AB2"/></cfdi:Comprobante>`;
    const r = parseOne(v33);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.toLowerCase()).toContain("3.3");
  });

  it("parseMany/parseBatch devuelven un outcome por comprobante", () => {
    expect(parseMany(XML_INGRESO_PUE)).toHaveLength(1);
    const batch = parseBatch([XML_INGRESO_PUE, "basura"]);
    expect(batch).toHaveLength(2);
    expect(batch[0].ok).toBe(true);
    expect(batch[1].ok).toBe(false);
  });
});
