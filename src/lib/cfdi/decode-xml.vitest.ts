/**
 * R7.4C — decodeXmlBytes: stripping de caracteres de control ILEGALES en XML 1.0.
 *
 * Por qué importa: el DOMParser del navegador RECHAZA el documento completo ante un solo control
 * char del rango C0 (p.ej. 0x14 → "xmlParseComment: invalid xmlChar value 20"), mientras el parser
 * regex de Node los ignora. Resultado real observado: un CFDI en ISO-8859-1 con un em-dash mal
 * codificado a latin1 (→ byte 0x14) se caía SOLO en el navegador (−1 CFDI silencioso). decodeXmlBytes
 * ahora los descarta (conservando tab/LF/CR) para reconciliar el parseo browser↔Node.
 *
 * Nota de entorno: vitest corre en Node (parser regex). Aquí se valida que el TEXTO decodificado
 * queda limpio (sin C0 ilegales) y que parsea; el rechazo del DOMParser se verificó en navegador real.
 */
import { describe, it, expect } from "vitest";
import { decodeXmlBytes } from "./upload";
import { parseMany } from "./parse";

const CTRL14 = String.fromCharCode(0x14); // lo que "—" (U+2014) produce al truncarse a latin1
const VTAB = String.fromCharCode(0x0b); // tabulación vertical: ilegal en XML 1.0
const FF = String.fromCharCode(0x0c); // form feed: ilegal en XML 1.0

function latin1Bytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}
function utf8Bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}
function hasIllegalC0(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 && c !== 9 && c !== 10 && c !== 13) return true;
  }
  return false;
}

describe("R7.4C decodeXmlBytes — control chars + encoding", () => {
  it("ISO-8859-1 con 0x14 en comentario: lo descarta, conserva acentos y parsea", () => {
    const xml =
      `<?xml version="1.0" encoding="ISO-8859-1"?>\n` +
      `<!-- nota ${CTRL14} sintetica -->\n` +
      `<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Fecha="2026-06-10T10:00:00" ` +
      `SubTotal="8000.00" Total="9280.00" Moneda="MXN" TipoDeComprobante="I">` +
      `<cfdi:Emisor Rfc="SYNU010101AB1" Nombre="José Núñez Peluquería S.A." RegimenFiscal="626"/>` +
      `<cfdi:Receptor Rfc="CLIA010101AB2" Nombre="Cliente" UsoCFDI="G03" RegimenFiscalReceptor="601"/>` +
      `<cfdi:Conceptos><cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" Descripcion="Diseño" ` +
      `ValorUnitario="8000.00" Importe="8000.00"/></cfdi:Conceptos></cfdi:Comprobante>`;

    const decoded = decodeXmlBytes(latin1Bytes(xml));

    expect(hasIllegalC0(decoded)).toBe(false); // 0x14 eliminado
    expect(decoded).toContain('encoding="UTF-8"'); // prólogo normalizado
    expect(decoded).toContain("Núñez"); // acentos intactos (no mojibake)

    const ok = parseMany(decoded).filter((r) => r.ok);
    expect(ok.length).toBe(1);
    expect(ok[0].ok && ok[0].cfdi.emisor.nombre).toContain("Núñez");
  });

  it("UTF-8 con varios control chars (0x0B, 0x0C) ilegales: los descarta y sigue parseando", () => {
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Fecha="2026-06-10T10:00:00" ` +
      `SubTotal="100.00" Total="116.00" Moneda="MXN" TipoDeComprobante="I">` +
      `<cfdi:Emisor Rfc="SYNU010101AB1" Nombre="Demo${VTAB}${FF}" RegimenFiscal="626"/>` +
      `<cfdi:Receptor Rfc="CLIA010101AB2" Nombre="Cliente" UsoCFDI="G03" RegimenFiscalReceptor="601"/>` +
      `<cfdi:Conceptos><cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" Descripcion="x" ` +
      `ValorUnitario="100.00" Importe="100.00"/></cfdi:Conceptos></cfdi:Comprobante>`;

    const decoded = decodeXmlBytes(utf8Bytes(xml));
    expect(hasIllegalC0(decoded)).toBe(false);
    expect(parseMany(decoded).filter((r) => r.ok).length).toBe(1);
  });

  it("conserva tab/LF/CR (saltos de línea legítimos no se tocan)", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\r\n\t<a>ok</a>\n`;
    const decoded = decodeXmlBytes(utf8Bytes(xml));
    expect(decoded.includes("\n")).toBe(true);
    expect(decoded.includes("\t")).toBe(true);
    expect(decoded.includes("\r")).toBe(true);
  });
});
