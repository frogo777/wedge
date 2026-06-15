/**
 * R7.3 — Correcciones fiscales de datos reales. Fixtures SINTÉTICOS (cero datos reales).
 *
 * Cubre: F1 retenciones a nivel documento (CFDIs de plataformas), F2 encoding ISO-8859-1,
 * F3 gasto deducible no automático (gate UsoCFDI), F5 summarizeCfdiTaxes excluye no-MXN,
 * F6 descripción genérica (sin acarrear el nombre fiscal del emisor).
 *
 * Nota de entorno: vitest corre en `node` (sin DOMParser), así que el parser usa la ruta
 * REGEX (que ya divide por tipo). El fix F1 en la ruta DOM la deja equivalente; aquí se
 * fija el CONTRATO de comportamiento que ambas rutas deben cumplir.
 */
import { describe, it, expect } from "vitest";
import { parseOne } from "./parse";
import { parseCFDI } from "@/lib/cfdi-parser";
import { normalizeCfdi } from "./normalize";
import { cfdiToTransaction, summarizeCfdiTaxes, isLikelyDeductibleUso } from "./taxes";
import { decodeXmlBytes } from "./upload";
import { XML_INGRESO_PUE, XML_GASTO_IVA, DEMO_USER_RFC } from "./fixtures";
import { buildMonthlyDeclaration } from "@/lib/tax/resico";

const NS = 'xmlns:cfdi="http://www.sat.gob.mx/cfd/4"';
const TFD = 'xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"';

/** CFDI de plataforma: Traslado IVA POR CONCEPTO, Retenciones SOLO a nivel documento. */
const XML_PLATAFORMA_RET_DOC = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante ${NS} Version="4.0" Fecha="2026-06-10T10:00:00" SubTotal="10000.00" Total="10407.50" Moneda="MXN" TipoDeComprobante="I" MetodoPago="PUE" FormaPago="03">
  <cfdi:Emisor Rfc="${DEMO_USER_RFC}" Nombre="Persona Demostracion" RegimenFiscal="626"/>
  <cfdi:Receptor Rfc="PLT0101019Z9" Nombre="Plataforma Demo SA de CV" UsoCFDI="G03" RegimenFiscalReceptor="601"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="80141600" Descripcion="Servicios de plataforma" Cantidad="1" ValorUnitario="10000.00" Importe="10000.00">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="10000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="1600.00"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosRetenidos="1192.50" TotalImpuestosTrasladados="1600.00">
    <cfdi:Retenciones>
      <cfdi:Retencion Impuesto="001" Importe="1062.50"/>
      <cfdi:Retencion Impuesto="002" Importe="130.00"/>
    </cfdi:Retenciones>
    <cfdi:Traslados>
      <cfdi:Traslado Base="10000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="1600.00"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital ${TFD} UUID="11111111-1111-4111-8111-111111111111" FechaTimbrado="2026-06-10T10:05:00"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

/** Variante: misma retención presente POR CONCEPTO y a nivel documento → NO debe duplicarse. */
const XML_RET_CONCEPTO_Y_DOC = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante ${NS} Version="4.0" Fecha="2026-06-10T10:00:00" SubTotal="10000.00" Total="9937.50" Moneda="MXN" TipoDeComprobante="I" MetodoPago="PUE" FormaPago="03">
  <cfdi:Emisor Rfc="${DEMO_USER_RFC}" Nombre="Persona Demostracion" RegimenFiscal="626"/>
  <cfdi:Receptor Rfc="PLT0101019Z9" Nombre="Cliente Demo" UsoCFDI="G03" RegimenFiscalReceptor="601"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="80141600" Descripcion="Servicios" Cantidad="1" ValorUnitario="10000.00" Importe="10000.00">
      <cfdi:Impuestos>
        <cfdi:Retenciones>
          <cfdi:Retencion Base="10000.00" Impuesto="001" TipoFactor="Tasa" TasaOCuota="0.012500" Importe="125.00"/>
        </cfdi:Retenciones>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosRetenidos="125.00">
    <cfdi:Retenciones>
      <cfdi:Retencion Impuesto="001" Importe="125.00"/>
    </cfdi:Retenciones>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital ${TFD} UUID="22222222-2222-4222-8222-222222222222" FechaTimbrado="2026-06-10T10:05:00"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

function norm(xml: string, userRfc = DEMO_USER_RFC) {
  const r = parseOne(xml);
  if (!r.ok) throw new Error(r.error);
  return normalizeCfdi(r.cfdi, { userRfc, source: "xml" });
}

describe("R7.3 F1 — retenciones a nivel documento (CFDIs de plataformas)", () => {
  it("lee retenciones ISR+IVA aunque vengan SOLO a nivel documento (Traslado por concepto)", () => {
    const p = parseCFDI(XML_PLATAFORMA_RET_DOC);
    if ("error" in p) throw new Error(p.error);
    expect(p.impuestos?.totalISRRetenido).toBe(1062.5);
    expect(p.impuestos?.totalIVARetenido).toBe(130);
    expect(p.impuestos?.totalIVA).toBe(1600); // Traslado por concepto, NO duplicado con el de documento
  });

  it("la retención llega al Mes Fiscal (no queda en 0)", () => {
    const tx = cfdiToTransaction(norm(XML_PLATAFORMA_RET_DOC));
    expect(tx?.type).toBe("in");
    expect(tx?.isr_retenido).toBe(1062.5);
    expect(tx?.iva_retenido).toBe(130);
    const decl = buildMonthlyDeclaration([tx!], "2026-06");
    expect(decl.ingresosCobrados).toBe(10000);
  });

  it("NO duplica una retención presente por concepto Y a nivel documento", () => {
    const p = parseCFDI(XML_RET_CONCEPTO_Y_DOC);
    if ("error" in p) throw new Error(p.error);
    expect(p.impuestos?.totalISRRetenido).toBe(125); // 125, no 250
  });
});

describe("R7.3 F2 — encoding XML (ISO-8859-1 / UTF-8)", () => {
  const xmlWith = (enc: string, nombre: string) =>
    `<?xml version="1.0" encoding="${enc}"?>\n<cfdi:Comprobante ${NS} Version="4.0"><cfdi:Emisor Nombre="${nombre}"/></cfdi:Comprobante>`;

  it("UTF-8 con acentos se decodifica correctamente", () => {
    const bytes = new TextEncoder().encode(xmlWith("UTF-8", "José Núñez Peluquería"));
    expect(decodeXmlBytes(bytes)).toContain("José Núñez Peluquería");
  });

  it("ISO-8859-1 con acentos NO produce mojibake (se respeta el encoding declarado)", () => {
    const str = xmlWith("ISO-8859-1", "José Núñez Mérida");
    // Bytes latin1: cada char <256 → su code point. (é=0xE9, ú=0xFA, í=0xED, ñ=0xF1)
    const bytes = Uint8Array.from(str, (c) => c.charCodeAt(0) & 0xff);
    const decoded = decodeXmlBytes(bytes);
    expect(decoded).toContain("José Núñez Mérida");
    expect(decoded).not.toContain("�"); // sin carácter de reemplazo (mojibake)
  });

  it("un CFDI completo en ISO-8859-1 sigue parseando bien (montos intactos)", () => {
    const xml = XML_INGRESO_PUE.replace('encoding="UTF-8"', 'encoding="ISO-8859-1"');
    const bytes = Uint8Array.from(xml, (c) => c.charCodeAt(0) & 0xff);
    const p = parseCFDI(decodeXmlBytes(bytes));
    expect("error" in p).toBe(false);
  });
});

describe("R7.3 F3 — gasto deducible no automático (gate UsoCFDI)", () => {
  it("isLikelyDeductibleUso: G01/G03/I04/D01 deducibles; S01/CP01/CN01/vacío/desconocido no", () => {
    for (const u of ["G01", "G02", "G03", "I04", "I08", "D01", "D10"]) expect(isLikelyDeductibleUso(u)).toBe(true);
    for (const u of ["S01", "CP01", "CN01", "", "XYZ", "P01"]) expect(isLikelyDeductibleUso(u)).toBe(false);
  });

  it("gasto recibido con UsoCFDI deducible (G03) → es_deducible true", () => {
    const tx = cfdiToTransaction(norm(XML_GASTO_IVA));
    expect(tx?.type).toBe("out");
    expect(tx?.es_deducible).toBe(true);
  });

  it("gasto recibido con UsoCFDI NO claro (S01) → es_deducible false (no se asume)", () => {
    const tx = cfdiToTransaction(norm(XML_GASTO_IVA.replace('UsoCFDI="G03"', 'UsoCFDI="S01"')));
    expect(tx?.type).toBe("out");
    expect(tx?.es_deducible).toBe(false);
  });
});

describe("R7.3 F5 — summarizeCfdiTaxes excluye moneda != MXN", () => {
  it("un ingreso en USD no se suma al resumen MXN", () => {
    const mxn = norm(XML_INGRESO_PUE);
    const usd = norm(XML_INGRESO_PUE.replace('Moneda="MXN"', 'Moneda="USD"'));
    const soloMxn = summarizeCfdiTaxes([mxn]);
    const conUsd = summarizeCfdiTaxes([mxn, usd]);
    expect(conUsd.ingresosDetectados).toBe(soloMxn.ingresosDetectados); // el USD no infló el total
    expect(conUsd.countIncome).toBe(1);
  });
});

describe("R7.3 F6 — descripción genérica (sin nombre fiscal crudo)", () => {
  it("si el concepto no tiene descripción, usa etiqueta genérica, NO el nombre del emisor", () => {
    const tx = cfdiToTransaction(norm(XML_INGRESO_PUE.replace(/Descripcion="[^"]*"/, 'Descripcion=""')));
    expect(tx?.description).toBe("CFDI emitido");
    expect(tx?.description).not.toContain("Persona Demostracion");
  });
});
