/**
 * Documentation-style tests for `parseCFDI`.
 *
 * These tests don't assume a specific test runner — they use plain assertions
 * and run either via `ts-node` / `tsx` or through any runner that evaluates the
 * top-level `runCfdiParserTests()` call.
 *
 * Purpose: serve as a canonical reference for what a valid CFDI 4.0 XML looks
 * like and what `parseCFDI` should return for it.
 */

import { parseCFDI, parseCFDIs, TIPO_COMPROBANTE_LABEL } from "./cfdi-parser";

/* ─── sample CFDI 4.0 — Ingreso, one concepto, with timbre ─────────────── */

export const SAMPLE_CFDI_40_XML = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  Version="4.0"
  Serie="A"
  Folio="0024"
  Fecha="2026-04-18T10:05:00"
  FormaPago="03"
  NoCertificado="00001000000500000000"
  SubTotal="12000.00"
  Moneda="MXN"
  Total="13920.00"
  TipoDeComprobante="I"
  MetodoPago="PUE"
  LugarExpedicion="06600"
  Exportacion="01">
  <cfdi:Emisor Rfc="MEAL900315XXX" Nombre="Alex Mendoza" RegimenFiscal="626"/>
  <cfdi:Receptor Rfc="EAB840704AB3" Nombre="EMPRESA ABC SA DE CV" DomicilioFiscalReceptor="06600" RegimenFiscalReceptor="601" UsoCFDI="G03"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="E48" Descripcion="Servicio de diseño gráfico" ValorUnitario="12000.00" Importe="12000.00" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="12000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="1920.00"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital
      xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd"
      Version="1.1"
      UUID="B4A2F1E3-0F1C-4C3B-9E51-3A7C8E1D2345"
      FechaTimbrado="2026-04-18T10:05:12"
      RfcProvCertif="AAA010101AAA"
      SelloCFD="FAKE_SELLO"
      NoCertificadoSAT="00001000000500000001"
      SelloSAT="FAKE_SAT_SELLO"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

/* ─── expected shape (for documentation) ───────────────────────────────── */

export const EXPECTED_PARSED = {
  version: "4.0" as const,
  fecha: "2026-04-18T10:05:00",
  subTotal: 12000,
  total: 13920,
  moneda: "MXN",
  tipoDeComprobante: "I" as const,
  emisor: { rfc: "MEAL900315XXX", nombre: "Alex Mendoza", regimenFiscal: "626" },
  receptor: { rfc: "EAB840704AB3", nombre: "EMPRESA ABC SA DE CV", usoCFDI: "G03" },
  timbre: { uuid: "B4A2F1E3-0F1C-4C3B-9E51-3A7C8E1D2345", fechaTimbrado: "2026-04-18T10:05:12" },
  conceptos: [
    {
      claveProdServ: "84111506",
      descripcion: "Servicio de diseño gráfico",
      cantidad: 1,
      valorUnitario: 12000,
      importe: 12000,
    },
  ],
};

/* ─── runner ───────────────────────────────────────────────────────────── */

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error("assertion failed: " + msg);
}

export function runCfdiParserTests() {
  /* happy path */
  const r = parseCFDI(SAMPLE_CFDI_40_XML);
  assert(!("error" in r), "sample should parse without error");
  assert(r.version === "4.0", "version is 4.0");
  assert(r.emisor.rfc === "MEAL900315XXX", "emisor RFC");
  assert(r.receptor.rfc === "EAB840704AB3", "receptor RFC");
  assert(r.tipoDeComprobante === "I", "tipo I");
  assert(TIPO_COMPROBANTE_LABEL[r.tipoDeComprobante] === "Ingreso", "label map");
  assert(r.total === 13920, "total");
  assert(r.subTotal === 12000, "subtotal");
  assert(r.conceptos.length === 1, "one concepto");
  assert(r.conceptos[0].descripcion === "Servicio de diseño gráfico", "concepto descripcion");
  assert(r.timbre && r.timbre.uuid.startsWith("B4A2F1E3"), "timbre UUID");

  /* impuestos extraction — sample CFDI has 1920 IVA trasladado, no retenciones */
  assert(r.impuestos !== undefined, "impuestos present");
  assert(r.impuestos!.totalIVA === 1920, "totalIVA = 1920");
  assert(r.impuestos!.totalISRRetenido === 0, "no ISR retenido");
  assert(r.impuestos!.totalIVARetenido === 0, "no IVA retenido");
  assert(r.impuestos!.trasladados.length === 1, "1 traslado");
  assert(r.impuestos!.trasladados[0].impuesto === "002", "traslado es IVA (002)");
  assert(Math.abs((r.impuestos!.trasladados[0].tasa ?? 0) - 0.16) < 0.001, "tasa 16%");

  /* CFDI with retenciones (honorarios a moral) */
  const CFDI_WITH_RET = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0"
  Fecha="2026-04-10T12:00:00" SubTotal="20000.00" Total="21066.67"
  Moneda="MXN" TipoDeComprobante="I" Exportacion="01" LugarExpedicion="06600">
  <cfdi:Emisor Rfc="MEAL900315XXX" Nombre="Alex" RegimenFiscal="626"/>
  <cfdi:Receptor Rfc="EAB840704AB3" Nombre="ACME" DomicilioFiscalReceptor="06600" RegimenFiscalReceptor="601" UsoCFDI="G03"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="E48" Descripcion="Honorarios" ValorUnitario="20000.00" Importe="20000.00" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="20000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="3200.00"/>
        </cfdi:Traslados>
        <cfdi:Retenciones>
          <cfdi:Retencion Base="20000.00" Impuesto="001" TipoFactor="Tasa" TasaOCuota="0.012500" Importe="250.00"/>
          <cfdi:Retencion Base="20000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.106667" Importe="2133.33"/>
        </cfdi:Retenciones>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
</cfdi:Comprobante>`;
  const ret = parseCFDI(CFDI_WITH_RET);
  assert(!("error" in ret), "CFDI with retenciones parses");
  assert(ret.impuestos!.totalIVA === 3200, "IVA 3200");
  assert(ret.impuestos!.totalISRRetenido === 250, "ISR retenido 250");
  assert(Math.abs(ret.impuestos!.totalIVARetenido - 2133.33) < 0.01, "IVA retenido 2133.33");

  /* wrong version */
  const v33 = SAMPLE_CFDI_40_XML.replace('Version="4.0"', 'Version="3.3"');
  const e = parseCFDI(v33);
  assert("error" in e, "3.3 should error");
  assert(e.error.includes("4.0"), "error mentions 4.0");

  /* empty input */
  const empty = parseCFDI("");
  assert("error" in empty, "empty input errors");

  /* non-xml */
  const junk = parseCFDI("hello world");
  assert("error" in junk, "junk input errors");

  /* ───────────────────────────────────────────────────────────────── */
  /*  CFDI tipo I (PPD) — invoice that will be settled with a tipo P   */
  /* ───────────────────────────────────────────────────────────────── */
  const CFDI_PPD = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0"
  Fecha="2026-03-01T09:00:00"
  FormaPago="99"
  MetodoPago="PPD"
  SubTotal="10000.00" Total="11600.00"
  Moneda="MXN" TipoDeComprobante="I"
  Exportacion="01" LugarExpedicion="06600">
  <cfdi:Emisor Rfc="MEAL900315XXX" Nombre="Alex" RegimenFiscal="626"/>
  <cfdi:Receptor Rfc="EAB840704AB3" Nombre="ACME" DomicilioFiscalReceptor="06600" RegimenFiscalReceptor="601" UsoCFDI="G03"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="E48" Descripcion="Proyecto PPD" ValorUnitario="10000.00" Importe="10000.00" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="10000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="1600.00"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
</cfdi:Comprobante>`;
  const ppd = parseCFDI(CFDI_PPD);
  assert(!("error" in ppd), "PPD CFDI parses");
  assert(ppd.metodoPago === "PPD", "metodoPago = PPD");
  assert(ppd.formaPago === "99",   "formaPago = 99");
  assert(ppd.tipoDeComprobante === "I", "PPD is still tipo I");

  /* ───────────────────────────────────────────────────────────────── */
  /*  CFDI tipo P — complemento de pago with 2 DoctoRelacionado refs   */
  /* ───────────────────────────────────────────────────────────────── */
  const CFDI_TIPO_P = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:pago20="http://www.sat.gob.mx/Pagos20"
  xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
  Version="4.0"
  Serie="P" Folio="0005"
  Fecha="2026-04-05T12:00:00"
  SubTotal="0" Total="0"
  Moneda="XXX"
  TipoDeComprobante="P"
  Exportacion="01"
  LugarExpedicion="06600">
  <cfdi:Emisor Rfc="MEAL900315XXX" Nombre="Alex" RegimenFiscal="626"/>
  <cfdi:Receptor Rfc="EAB840704AB3" Nombre="ACME" DomicilioFiscalReceptor="06600" RegimenFiscalReceptor="601" UsoCFDI="CP01"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago" ValorUnitario="0" Importe="0" ObjetoImp="01"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <pago20:Pagos Version="2.0">
      <pago20:Totales MontoTotalPagos="15000.00"/>
      <pago20:Pago FechaPago="2026-04-04T10:00:00" FormaDePagoP="03" MonedaP="MXN" TipoCambioP="1" Monto="15000.00">
        <pago20:DoctoRelacionado
          IdDocumento="B4A2F1E3-0F1C-4C3B-9E51-3A7C8E1D2345"
          MonedaDR="MXN"
          EquivalenciaDR="1"
          NumParcialidad="1"
          ImpSaldoAnt="11600.00"
          ImpPagado="11600.00"
          ImpSaldoInsoluto="0.00"
          ObjetoImpDR="02"/>
        <pago20:DoctoRelacionado
          IdDocumento="A19C2E05-1111-2222-3333-444455556666"
          MonedaDR="MXN"
          EquivalenciaDR="1"
          NumParcialidad="1"
          ImpSaldoAnt="3400.00"
          ImpPagado="3400.00"
          ImpSaldoInsoluto="0.00"
          ObjetoImpDR="02"/>
      </pago20:Pago>
    </pago20:Pagos>
    <tfd:TimbreFiscalDigital
      Version="1.1"
      UUID="99999999-AAAA-BBBB-CCCC-0000000000FF"
      FechaTimbrado="2026-04-05T12:00:10"
      RfcProvCertif="AAA010101AAA"
      SelloCFD="X"
      NoCertificadoSAT="00001000000500000001"
      SelloSAT="X"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
  const pago = parseCFDI(CFDI_TIPO_P);
  assert(!("error" in pago), "tipo P parses");
  assert(pago.tipoDeComprobante === "P", "tipo P");
  assert(TIPO_COMPROBANTE_LABEL[pago.tipoDeComprobante] === "Pago", "label P=Pago");
  assert(Array.isArray(pago.pagos) && pago.pagos!.length === 1, "one pago block");
  const p = pago.pagos![0];
  assert(p.monto === 15000, "monto = 15000");
  assert(p.formaDePago === "03", "forma 03");
  assert(p.fechaPago.startsWith("2026-04-04"), "fechaPago");
  assert(p.relacionados.length === 2, "2 DoctoRelacionado");
  assert(p.relacionados[0].uuid === "B4A2F1E3-0F1C-4C3B-9E51-3A7C8E1D2345", "doc1 UUID");
  assert(p.relacionados[0].impPagado === 11600, "doc1 impPagado");
  assert(p.relacionados[0].numParcialidad === 1, "doc1 parcialidad");
  assert(p.relacionados[1].uuid === "A19C2E05-1111-2222-3333-444455556666", "doc2 UUID");
  assert(p.relacionados[1].impPagado === 3400, "doc2 impPagado");

  /* ───────────────────────────────────────────────────────────────── */
  /*  CFDI tipo N — nómina with percepciones and deducciones           */
  /* ───────────────────────────────────────────────────────────────── */
  const CFDI_TIPO_N = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:nomina12="http://www.sat.gob.mx/nomina12"
  Version="4.0"
  Serie="N" Folio="00001"
  Fecha="2026-04-15T08:00:00"
  FormaPago="99"
  MetodoPago="PUE"
  SubTotal="20000.00" Descuento="3500.00"
  Total="16500.00"
  Moneda="MXN"
  TipoDeComprobante="N"
  Exportacion="01"
  LugarExpedicion="06600">
  <cfdi:Emisor Rfc="EMP950101ABC" Nombre="Empleador SA" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="MEAL900315XXX" Nombre="Alex" DomicilioFiscalReceptor="06600" RegimenFiscalReceptor="605" UsoCFDI="CN01"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111505" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago de nómina" ValorUnitario="20000.00" Importe="20000.00" Descuento="3500.00" ObjetoImp="01"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <nomina12:Nomina Version="1.2" TipoNomina="O" FechaPago="2026-04-15" FechaInicialPago="2026-04-01" FechaFinalPago="2026-04-15" NumDiasPagados="15" TotalPercepciones="20000.00" TotalDeducciones="3500.00" TotalOtrosPagos="0">
      <nomina12:Percepciones TotalSueldos="20000.00" TotalGravado="18000.00" TotalExento="2000.00"/>
      <nomina12:Deducciones TotalOtrasDeducciones="500.00" TotalImpuestosRetenidos="3000.00"/>
    </nomina12:Nomina>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
  const nom = parseCFDI(CFDI_TIPO_N);
  assert(!("error" in nom), "tipo N parses");
  assert(nom.tipoDeComprobante === "N", "tipo N");
  assert(nom.nomina !== undefined, "nomina present");
  assert(nom.nomina!.totalPercepciones === 20000, "percepciones 20000");
  assert(nom.nomina!.totalDeducciones === 3500,  "deducciones 3500");
  assert(nom.nomina!.netoPagado === 16500,       "neto 16500");
  assert(nom.nomina!.tipoNomina === "O",         "nómina ordinaria");

  /* ───────────────────────────────────────────────────────────────── */
  /*  CFDI 3.3 rejection — clearer error                               */
  /* ───────────────────────────────────────────────────────────────── */
  const CFDI_33 = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/3" Version="3.3" Fecha="2023-01-01T00:00:00" Total="100" SubTotal="100" Moneda="MXN" TipoDeComprobante="I" LugarExpedicion="06600">
  <cfdi:Emisor Rfc="X" Nombre="X" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="Y" Nombre="Y" UsoCFDI="G03"/>
</cfdi:Comprobante>`;
  const r33 = parseCFDI(CFDI_33);
  assert("error" in r33, "3.3 rejected");
  assert(r33.error.includes("3.3"),   "mentions 3.3");
  assert(r33.error.includes("4.0"),   "mentions 4.0");

  /* ───────────────────────────────────────────────────────────────── */
  /*  Acuse rejection                                                  */
  /* ───────────────────────────────────────────────────────────────── */
  const ACUSE = `<?xml version="1.0" encoding="UTF-8"?>
<Acuse Fecha="2026-04-22T10:00:00" CodEstatus="S"><Folios/></Acuse>`;
  const ra = parseCFDI(ACUSE);
  assert("error" in ra, "acuse rejected");
  assert(ra.error.toLowerCase().includes("acuse"), "error says acuse");

  /* ───────────────────────────────────────────────────────────────── */
  /*  Multi-CFDI wrapper                                               */
  /* ───────────────────────────────────────────────────────────────── */
  const WRAPPER = `<?xml version="1.0" encoding="UTF-8"?>
<Lote>
${SAMPLE_CFDI_40_XML.replace('<?xml version="1.0" encoding="UTF-8"?>', "")}
${SAMPLE_CFDI_40_XML
  .replace('<?xml version="1.0" encoding="UTF-8"?>', "")
  .replace("B4A2F1E3-0F1C-4C3B-9E51-3A7C8E1D2345", "FEEDFACE-0000-0000-0000-BEEFBEEFBEEF")}
</Lote>`;
  const many = parseCFDIs(WRAPPER);
  assert(many.length === 2, "2 CFDIs extracted");
  assert(!("error" in many[0]) && !("error" in many[1]), "both parse");
  const m0 = many[0] as { timbre: { uuid: string } | null };
  const m1 = many[1] as { timbre: { uuid: string } | null };
  assert(m0.timbre!.uuid.startsWith("B4A2F1E3"), "first UUID");
  assert(m1.timbre!.uuid.startsWith("FEEDFACE"), "second UUID");

  return "ok";
}

// When imported directly the tests run. Bundlers will tree-shake this away
// in production because `parseCFDI` is the only other export that matters.
if (typeof process !== "undefined" && process.env && process.env.RUN_CFDI_TESTS === "1") {
   
  console.log("cfdi-parser tests:", runCfdiParserTests());
}
