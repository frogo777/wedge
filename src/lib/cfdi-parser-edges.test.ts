/**
 * Edge-case tests for `parseCFDI` / `parseCFDIs`.
 *
 * Complements `cfdi-parser.test.ts` (happy path) by exercising error
 * branches and less-common comprobante types.
 *
 * Run via:
 *   npx tsx src/lib/cfdi-parser-edges.test.ts
 */

import { parseCFDI, parseCFDIs } from "./cfdi-parser";

/* ─── tiny assertion helpers ──────────────────────────── */

function eq<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(
      `${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`,
    );
  }
}
function truthy(v: unknown, label: string) {
  if (!v) throw new Error(`${label} (expected truthy, got ${JSON.stringify(v)})`);
}
function falsy(v: unknown, label: string) {
  if (v) throw new Error(`${label} (expected falsy, got ${JSON.stringify(v)})`);
}

/* ─── fixture builders ───────────────────────────────── */

const CFDI_NO_TIMBRE = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0"
  Fecha="2026-04-01T10:00:00" SubTotal="1000.00" Total="1160.00"
  Moneda="MXN" TipoDeComprobante="I" Exportacion="01" LugarExpedicion="06600">
  <cfdi:Emisor Rfc="MEAL900315XXX" Nombre="Alex" RegimenFiscal="626"/>
  <cfdi:Receptor Rfc="EAB840704AB3" Nombre="ACME" DomicilioFiscalReceptor="06600" RegimenFiscalReceptor="601" UsoCFDI="G03"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="E48" Descripcion="X" ValorUnitario="1000.00" Importe="1000.00" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="1000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="160.00"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
</cfdi:Comprobante>`;

const CFDI_33 = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/3" Version="3.3"
  Fecha="2023-01-01T00:00:00" SubTotal="100" Total="100" Moneda="MXN"
  TipoDeComprobante="I" LugarExpedicion="06600">
  <cfdi:Emisor Rfc="X" Nombre="X" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="Y" Nombre="Y" UsoCFDI="G03"/>
</cfdi:Comprobante>`;

const ACUSE = `<?xml version="1.0" encoding="UTF-8"?>
<Acuse Fecha="2026-04-22T10:00:00" CodEstatus="S"><Folios/></Acuse>`;

const CFDI_PPD = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0"
  Fecha="2026-03-01T09:00:00" FormaPago="99" MetodoPago="PPD"
  SubTotal="10000.00" Total="11600.00" Moneda="MXN" TipoDeComprobante="I"
  Exportacion="01" LugarExpedicion="06600">
  <cfdi:Emisor Rfc="MEAL900315XXX" Nombre="Alex" RegimenFiscal="626"/>
  <cfdi:Receptor Rfc="EAB840704AB3" Nombre="ACME" DomicilioFiscalReceptor="06600" RegimenFiscalReceptor="601" UsoCFDI="G03"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="E48" Descripcion="Proyecto" ValorUnitario="10000.00" Importe="10000.00" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="10000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="1600.00"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
</cfdi:Comprobante>`;

const CFDI_TIPO_P = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:pago20="http://www.sat.gob.mx/Pagos20"
  Version="4.0" Fecha="2026-04-05T12:00:00"
  SubTotal="0" Total="0" Moneda="XXX"
  TipoDeComprobante="P" Exportacion="01" LugarExpedicion="06600">
  <cfdi:Emisor Rfc="MEAL900315XXX" Nombre="Alex" RegimenFiscal="626"/>
  <cfdi:Receptor Rfc="EAB840704AB3" Nombre="ACME" DomicilioFiscalReceptor="06600" RegimenFiscalReceptor="601" UsoCFDI="CP01"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago" ValorUnitario="0" Importe="0" ObjetoImp="01"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <pago20:Pagos Version="2.0">
      <pago20:Totales MontoTotalPagos="5800.00"/>
      <pago20:Pago FechaPago="2026-04-04T10:00:00" FormaDePagoP="03" MonedaP="MXN" TipoCambioP="1" Monto="5800.00">
        <pago20:DoctoRelacionado IdDocumento="AAAAAAAA-1111-2222-3333-444455556666" MonedaDR="MXN" EquivalenciaDR="1" NumParcialidad="1" ImpSaldoAnt="5800.00" ImpPagado="5800.00" ImpSaldoInsoluto="0.00" ObjetoImpDR="02"/>
      </pago20:Pago>
    </pago20:Pagos>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

const CFDI_TIPO_N = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:nomina12="http://www.sat.gob.mx/nomina12"
  Version="4.0" Fecha="2026-04-15T08:00:00"
  FormaPago="99" MetodoPago="PUE" SubTotal="20000.00" Descuento="3500.00"
  Total="16500.00" Moneda="MXN" TipoDeComprobante="N"
  Exportacion="01" LugarExpedicion="06600">
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

const CFDI_MIXED_IMPS = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0"
  Fecha="2026-04-12T10:00:00" SubTotal="10000.00" Total="9783.33"
  Moneda="MXN" TipoDeComprobante="I" Exportacion="01" LugarExpedicion="06600">
  <cfdi:Emisor Rfc="MEAL900315XXX" Nombre="Alex" RegimenFiscal="626"/>
  <cfdi:Receptor Rfc="EAB840704AB3" Nombre="ACME" DomicilioFiscalReceptor="06600" RegimenFiscalReceptor="601" UsoCFDI="G03"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="E48" Descripcion="Servicio A" ValorUnitario="6000.00" Importe="6000.00" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="6000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="960.00"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
    <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="E48" Descripcion="Servicio B" ValorUnitario="4000.00" Importe="4000.00" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="4000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="640.00"/>
        </cfdi:Traslados>
        <cfdi:Retenciones>
          <cfdi:Retencion Base="4000.00" Impuesto="001" TipoFactor="Tasa" TasaOCuota="0.100000" Importe="400.00"/>
          <cfdi:Retencion Base="4000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.106667" Importe="426.67"/>
        </cfdi:Retenciones>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
</cfdi:Comprobante>`;

/* ─── tests ──────────────────────────────────────────── */

async function testNoTimbre() {
  const r = parseCFDI(CFDI_NO_TIMBRE);
  truthy(!("error" in r), "sin timbrar still parses");
  if (!("error" in r)) {
    eq(r.timbre, null, "timbre = null when ausente");
    eq(r.total, 1160, "total still parsed");
  }
}

async function testCFDI33Rejected() {
  const r = parseCFDI(CFDI_33);
  truthy("error" in r, "3.3 rejected");
  if ("error" in r) {
    truthy(r.error.includes("3.3") && r.error.includes("4.0"), "error mentions versions");
  }
}

async function testAcuseRejected() {
  const r = parseCFDI(ACUSE);
  truthy("error" in r, "acuse rejected");
  if ("error" in r) {
    truthy(r.error.toLowerCase().includes("acuse"), "error mentions acuse");
  }
}

async function testTipoPParsesPagos() {
  const r = parseCFDI(CFDI_TIPO_P);
  truthy(!("error" in r), "tipo P parses");
  if (!("error" in r)) {
    eq(r.tipoDeComprobante, "P", "tipo P");
    truthy(Array.isArray(r.pagos) && r.pagos.length === 1, "one pago block");
    eq(r.pagos![0].monto, 5800, "monto");
    eq(r.pagos![0].relacionados.length, 1, "1 relacionado");
  }
}

async function testTipoNParsesNomina() {
  const r = parseCFDI(CFDI_TIPO_N);
  truthy(!("error" in r), "tipo N parses");
  if (!("error" in r)) {
    eq(r.tipoDeComprobante, "N", "tipo N");
    truthy(r.nomina !== undefined, "nomina present");
    eq(r.nomina!.totalPercepciones, 20000, "percepciones");
    eq(r.nomina!.totalDeducciones, 3500, "deducciones");
    eq(r.nomina!.netoPagado, 16500, "neto");
  }
}

async function testPPDMetodoPago() {
  const r = parseCFDI(CFDI_PPD);
  truthy(!("error" in r), "PPD parses");
  if (!("error" in r)) {
    eq(r.metodoPago, "PPD", "metodoPago = PPD");
    eq(r.tipoDeComprobante, "I", "still tipo I");
  }
}

async function testMixedTrasladosRetenciones() {
  const r = parseCFDI(CFDI_MIXED_IMPS);
  truthy(!("error" in r), "mixed parses");
  if (!("error" in r)) {
    truthy(r.impuestos !== undefined, "impuestos present");
    // 960 + 640 = 1600 IVA trasladado
    eq(r.impuestos!.totalIVA, 1600, "totalIVA = sum across conceptos");
    eq(r.impuestos!.totalISRRetenido, 400, "ISR retenido aggregated");
    truthy(Math.abs(r.impuestos!.totalIVARetenido - 426.67) < 0.01, "IVA retenido");
    eq(r.impuestos!.trasladados.length >= 1, true, "trasladados array non-empty");
  }
}

async function testEmptyAndNonXml() {
  const empty = parseCFDI("");
  truthy("error" in empty, "empty returns ParseError");
  const junk = parseCFDI("not xml at all <<>>");
  truthy("error" in junk, "junk returns ParseError");
  const closeButNo = parseCFDI("<foo>no comprobante</foo>");
  truthy("error" in closeButNo, "non-comprobante returns ParseError");
}

async function testMultipleCFDIsWrapper() {
  const wrapped = `<?xml version="1.0" encoding="UTF-8"?>
<Lote>
${CFDI_NO_TIMBRE.replace('<?xml version="1.0" encoding="UTF-8"?>', "")}
${CFDI_PPD.replace('<?xml version="1.0" encoding="UTF-8"?>', "")}
</Lote>`;
  const arr = parseCFDIs(wrapped);
  truthy(Array.isArray(arr), "returns array");
  eq(arr.length, 2, "two CFDIs extracted");
  truthy(!("error" in arr[0]), "first parses");
  truthy(!("error" in arr[1]), "second parses");
}

/* ─── runner ─────────────────────────────────────────── */

const TESTS: Array<[string, () => Promise<void>]> = [
  ["CFDI without Timbre returns timbre=null", testNoTimbre],
  ["CFDI 3.3 rejected with clear error", testCFDI33Rejected],
  ["Acuse XML rejected", testAcuseRejected],
  ["Tipo P parses pagos[]", testTipoPParsesPagos],
  ["Tipo N parses nomina with employee fields", testTipoNParsesNomina],
  ["Tipo I PPD returns metodoPago=PPD", testPPDMetodoPago],
  ["Mixed traslados+retenciones across conceptos", testMixedTrasladosRetenciones],
  ["Empty / non-XML returns ParseError shape", testEmptyAndNonXml],
  ["parseCFDIs returns array for wrapper", testMultipleCFDIsWrapper],
];

export async function runCfdiParserEdgeTests(): Promise<{ passed: number; failed: number }> {
  let passed = 0, failed = 0;
  for (const [name, fn] of TESTS) {
    try {
      await fn();
      passed++;
      console.log(`  ok ${name}`);
    } catch (err) {
      failed++;
      console.error(`  FAIL ${name}\n    ${(err as Error).message}`);
    }
  }
  console.log(`\ncfdi-parser-edges: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

if (typeof require !== "undefined" && require.main === module) {
  runCfdiParserEdgeTests().then(r => process.exit(r.failed === 0 ? 0 : 1));
}
