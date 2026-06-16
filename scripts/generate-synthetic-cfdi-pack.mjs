/**
 * generate-synthetic-cfdi-pack.mjs — R7.4A
 *
 * Genera un paquete de CFDIs 4.0 SINTÉTICOS (datos OBVIAMENTE FALSOS) para validar el pipeline de
 * Wedge (parser/UX/flujo) SIN usar datos fiscales reales ni del founder. NO son CFDIs válidos para
 * el SAT (timbre falso). Node puro + fflate (ya es dependencia). Determinista (fechas/UUID fijos).
 *
 * Uso:  npm run fixtures:cfdi   (o: node scripts/generate-synthetic-cfdi-pack.mjs)
 * Salida: fixtures/cfdi/synthetic/xml/*.xml  +  fixtures/cfdi/synthetic/zip/*.zip
 */
import { zipSync } from "fflate";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const XML_DIR = join(ROOT, "fixtures/cfdi/synthetic/xml");
const ZIP_DIR = join(ROOT, "fixtures/cfdi/synthetic/zip");

// ── Constantes SINTÉTICAS (falsas; NO usar RFC/empresas/clientes reales) ──────────────
const USER = { rfc: "SYNU010101AB1", nombre: "Persona Sintetica Demo", regimen: "626" }; // RESICO PF
const CLIENTE = { rfc: "CLIA010101AB2", nombre: "Cliente Sintetico A SA de CV", regimen: "601" };
const PLATAFORMA = { rfc: "PLAT010101AB3", nombre: "Plataforma Sintetica SA de CV", regimen: "601" };
const PROV = { rfc: "PROV010101AB4", nombre: "Proveedor Sintetico SA de CV", regimen: "601" };
const uuid = (n) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;

const CFDI = "xmlns:cfdi=\"http://www.sat.gob.mx/cfd/4\"";
const TFD = "xmlns:tfd=\"http://www.sat.gob.mx/TimbreFiscalDigital\"";
const PAGO = "xmlns:pago20=\"http://www.sat.gob.mx/Pagos20\"";

function cfdiXml(o) {
  const enc = o.encoding || "UTF-8";
  const metodo = o.metodoPago ? ` MetodoPago="${o.metodoPago}"` : "";
  const conceptoImp = o.conceptoImpuestos || "";
  const docImp = o.docImpuestos || "";
  const extra = o.complemento || "";
  return `<?xml version="1.0" encoding="${enc}"?>
<!-- SINTÉTICO - datos falsos para pruebas de Wedge. NO es un CFDI válido para el SAT. -->
<cfdi:Comprobante ${CFDI} Version="4.0" Fecha="${o.fecha}" SubTotal="${o.subTotal}" Total="${o.total}" Moneda="${o.moneda || "MXN"}" TipoDeComprobante="${o.tipo}"${metodo} FormaPago="${o.formaPago || "03"}" Exportacion="01" LugarExpedicion="64000">
  <cfdi:Emisor Rfc="${o.emisor.rfc}" Nombre="${o.emisor.nombre}" RegimenFiscal="${o.emisor.regimen}"/>
  <cfdi:Receptor Rfc="${o.receptor.rfc}" Nombre="${o.receptor.nombre}" DomicilioFiscalReceptor="64000" RegimenFiscalReceptor="${o.receptor.regimen}" UsoCFDI="${o.uso || "G03"}"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="E48" Descripcion="${o.desc || "Servicios profesionales sinteticos"}" ValorUnitario="${o.subTotal}" Importe="${o.subTotal}" ObjetoImp="${o.objetoImp || "02"}">${conceptoImp}</cfdi:Concepto>
  </cfdi:Conceptos>${docImp}
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital ${TFD} Version="1.1" UUID="${o.uuid}" FechaTimbrado="${o.fecha}" SelloCFD="SINTETICO" NoCertificadoSAT="00000000000000000000"/>${extra}
  </cfdi:Complemento>
</cfdi:Comprobante>`;
}

// Helpers de bloques de impuestos
const trasIVA = (base, imp = (base * 0.16)) =>
  `<cfdi:Traslado Base="${base}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${imp.toFixed(2)}"/>`;
const retISR = (base, tasa, imp) =>
  `<cfdi:Retencion Base="${base}" Impuesto="001" TipoFactor="Tasa" TasaOCuota="${tasa}" Importe="${imp.toFixed(2)}"/>`;
const retIVA = (base, tasa, imp) =>
  `<cfdi:Retencion Base="${base}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="${tasa}" Importe="${imp.toFixed(2)}"/>`;
const conceptoImp = (traslados = "", retenciones = "") =>
  `<cfdi:Impuestos>${traslados ? `<cfdi:Traslados>${traslados}</cfdi:Traslados>` : ""}${retenciones ? `<cfdi:Retenciones>${retenciones}</cfdi:Retenciones>` : ""}</cfdi:Impuestos>`;
const docImpBlock = ({ totalTras = "", totalRet = "", traslados = "", retenciones = "" }) =>
  `\n  <cfdi:Impuestos${totalRet ? ` TotalImpuestosRetenidos="${totalRet}"` : ""}${totalTras ? ` TotalImpuestosTrasladados="${totalTras}"` : ""}>${retenciones ? `<cfdi:Retenciones>${retenciones}</cfdi:Retenciones>` : ""}${traslados ? `<cfdi:Traslados>${traslados}</cfdi:Traslados>` : ""}</cfdi:Impuestos>`;

const JUN = "2026-06-10T10:00:00";
const MAY = "2026-05-12T11:00:00";

// ── 13 casos (cubren los 14 de la TAREA; cancelado = limitación documentada en README) ──
const cases = [
  { file: "01-ingreso-pue-mxn.xml", enc: "utf8", xml: cfdiXml({
      fecha: JUN, subTotal: "10000.00", total: "11600.00", tipo: "I", metodoPago: "PUE",
      emisor: USER, receptor: CLIENTE, uuid: uuid(1), uso: "G03",
      conceptoImpuestos: conceptoImp(trasIVA(10000)),
      docImpuestos: docImpBlock({ totalTras: "1600.00", traslados: trasIVA(10000) }) }) },

  { file: "02-ingreso-ret-isr.xml", enc: "utf8", xml: cfdiXml({
      fecha: JUN, subTotal: "10000.00", total: "11475.00", tipo: "I", metodoPago: "PUE",
      emisor: USER, receptor: CLIENTE, uuid: uuid(2), uso: "G03",
      conceptoImpuestos: conceptoImp(trasIVA(10000), retISR(10000, "0.012500", 125)),
      docImpuestos: docImpBlock({ totalTras: "1600.00", totalRet: "125.00", traslados: trasIVA(10000), retenciones: retISR(10000, "0.012500", 125) }) }) },

  { file: "03-ingreso-ret-iva.xml", enc: "utf8", xml: cfdiXml({
      fecha: JUN, subTotal: "10000.00", total: "10533.33", tipo: "I", metodoPago: "PUE",
      emisor: USER, receptor: CLIENTE, uuid: uuid(3), uso: "G03",
      conceptoImpuestos: conceptoImp(trasIVA(10000), retIVA(10000, "0.106667", 1066.67)),
      docImpuestos: docImpBlock({ totalTras: "1600.00", totalRet: "1066.67", traslados: trasIVA(10000), retenciones: retIVA(10000, "0.106667", 1066.67) }) }) },

  { file: "04-ingreso-plataforma-ret-concepto.xml", enc: "utf8", xml: cfdiXml({
      fecha: JUN, subTotal: "10000.00", total: "10408.33", tipo: "I", metodoPago: "PUE",
      emisor: USER, receptor: PLATAFORMA, uuid: uuid(4), uso: "G03",
      desc: "Servicios via plataforma sintetica",
      conceptoImpuestos: conceptoImp(trasIVA(10000), retISR(10000, "0.012500", 125) + retIVA(10000, "0.106667", 1066.67)),
      docImpuestos: docImpBlock({ totalTras: "1600.00", totalRet: "1191.67", traslados: trasIVA(10000), retenciones: retISR(10000, "0.012500", 125) + retIVA(10000, "0.106667", 1066.67) }) }) },

  // F1: retención SOLO a nivel documento (Traslado por concepto). Caso real de plataformas.
  { file: "05-ingreso-plataforma-ret-documento.xml", enc: "utf8", xml: cfdiXml({
      fecha: JUN, subTotal: "10000.00", total: "10408.33", tipo: "I", metodoPago: "PUE",
      emisor: USER, receptor: PLATAFORMA, uuid: uuid(5), uso: "G03",
      desc: "Servicios plataforma (retencion a nivel documento)",
      conceptoImpuestos: conceptoImp(trasIVA(10000)),
      docImpuestos: docImpBlock({ totalTras: "1600.00", totalRet: "1191.67", traslados: trasIVA(10000), retenciones: retISR(10000, "0.012500", 125) + retIVA(10000, "0.106667", 1066.67) }) }) },

  { file: "06-ingreso-ppd.xml", enc: "utf8", xml: cfdiXml({
      fecha: JUN, subTotal: "20000.00", total: "23200.00", tipo: "I", metodoPago: "PPD",
      emisor: USER, receptor: CLIENTE, uuid: uuid(6), uso: "G03",
      conceptoImpuestos: conceptoImp(trasIVA(20000)),
      docImpuestos: docImpBlock({ totalTras: "3200.00", traslados: trasIVA(20000) }) }) },

  // 07: REP (tipo P) relacionado al PPD #06 — no es ingreso nuevo.
  { file: "07-rep-complemento.xml", enc: "utf8", xml: `<?xml version="1.0" encoding="UTF-8"?>
<!-- SINTÉTICO - REP (complemento de pago). NO válido para SAT. -->
<cfdi:Comprobante ${CFDI} Version="4.0" Fecha="2026-06-20T09:00:00" SubTotal="0" Total="0" Moneda="XXX" TipoDeComprobante="P" LugarExpedicion="64000" Exportacion="01">
  <cfdi:Emisor Rfc="${USER.rfc}" Nombre="${USER.nombre}" RegimenFiscal="${USER.regimen}"/>
  <cfdi:Receptor Rfc="${CLIENTE.rfc}" Nombre="${CLIENTE.nombre}" DomicilioFiscalReceptor="64000" RegimenFiscalReceptor="${CLIENTE.regimen}" UsoCFDI="CP01"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago" ValorUnitario="0" Importe="0" ObjetoImp="01"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital ${TFD} Version="1.1" UUID="${uuid(7)}" FechaTimbrado="2026-06-20T09:00:00" SelloCFD="SINTETICO" NoCertificadoSAT="00000000000000000000"/>
    <pago20:Pagos ${PAGO} Version="2.0">
      <pago20:Pago FechaPago="2026-06-20T08:00:00" FormaDePagoP="03" MonedaP="MXN" TipoCambioP="1" Monto="23200.00">
        <pago20:DoctoRelacionado IdDocumento="${uuid(6)}" MonedaDR="MXN" NumParcialidad="1" ImpSaldoAnt="23200.00" ImpPagado="23200.00" ImpSaldoInsoluto="0.00" ObjetoImpDR="02"/>
      </pago20:Pago>
    </pago20:Pagos>
  </cfdi:Complemento>
</cfdi:Comprobante>` },

  { file: "08-gasto-g03-deducible.xml", enc: "utf8", xml: cfdiXml({
      fecha: JUN, subTotal: "5000.00", total: "5800.00", tipo: "I", metodoPago: "PUE", formaPago: "03",
      emisor: PROV, receptor: USER, uuid: uuid(8), uso: "G03", desc: "Software y servicios de oficina",
      conceptoImpuestos: conceptoImp(trasIVA(5000)),
      docImpuestos: docImpBlock({ totalTras: "800.00", traslados: trasIVA(5000) }) }) },

  { file: "09-gasto-s01-no-claro.xml", enc: "utf8", xml: cfdiXml({
      fecha: JUN, subTotal: "3000.00", total: "3480.00", tipo: "I", metodoPago: "PUE", formaPago: "01",
      emisor: PROV, receptor: USER, uuid: uuid(9), uso: "S01", desc: "Consumo varios",
      conceptoImpuestos: conceptoImp(trasIVA(3000)),
      docImpuestos: docImpBlock({ totalTras: "480.00", traslados: trasIVA(3000) }) }) },

  { file: "10-egreso-nota-credito.xml", enc: "utf8", xml: cfdiXml({
      fecha: JUN, subTotal: "2000.00", total: "2320.00", tipo: "E", metodoPago: "PUE",
      emisor: USER, receptor: CLIENTE, uuid: uuid(10), uso: "G02", desc: "Nota de credito sintetica",
      conceptoImpuestos: conceptoImp(trasIVA(2000)),
      docImpuestos: docImpBlock({ totalTras: "320.00", traslados: trasIVA(2000) }) }) },

  { file: "11-ingreso-usd.xml", enc: "utf8", xml: cfdiXml({
      fecha: JUN, subTotal: "1000.00", total: "1160.00", moneda: "USD", tipo: "I", metodoPago: "PUE",
      emisor: USER, receptor: CLIENTE, uuid: uuid(11), uso: "G03", desc: "Servicios a cliente extranjero",
      conceptoImpuestos: conceptoImp(trasIVA(1000)),
      docImpuestos: docImpBlock({ totalTras: "160.00", traslados: trasIVA(1000) }) }) },

  // 12: encoding ISO-8859-1 con acentos (se escribe en bytes latin1).
  { file: "12-ingreso-iso8859.xml", enc: "latin1", xml: cfdiXml({
      fecha: JUN, subTotal: "8000.00", total: "9280.00", tipo: "I", metodoPago: "PUE",
      emisor: { rfc: USER.rfc, nombre: "José Núñez Peluquería S.A.", regimen: USER.regimen },
      receptor: CLIENTE, uuid: uuid(12), uso: "G03", desc: "Diseño y atención (acentos: áéíóú ñ)",
      encoding: "ISO-8859-1",
      conceptoImpuestos: conceptoImp(trasIVA(8000)),
      docImpuestos: docImpBlock({ totalTras: "1280.00", traslados: trasIVA(8000) }) }) },

  // 13: ingreso de MAYO (para el ZIP multi-mes).
  { file: "13-ingreso-mayo.xml", enc: "utf8", xml: cfdiXml({
      fecha: MAY, subTotal: "7000.00", total: "8120.00", tipo: "I", metodoPago: "PUE",
      emisor: USER, receptor: CLIENTE, uuid: uuid(13), uso: "G03", desc: "Servicios de mayo",
      conceptoImpuestos: conceptoImp(trasIVA(7000)),
      docImpuestos: docImpBlock({ totalTras: "1120.00", traslados: trasIVA(7000) }) }) },
];

mkdirSync(XML_DIR, { recursive: true });
mkdirSync(ZIP_DIR, { recursive: true });

// Garantiza que el XML "latin1" sea VÁLIDO: cualquier codepoint > 0xFF (p.ej. un em-dash "—") se
// truncaría con Buffer.from(...,"latin1") a un byte de control que el DOMParser del navegador rechaza
// (descarta el CFDI entero). Lo mapeamos a "-" antes de escribir. Sin esto, R7.4C se podría reintroducir.
const toLatin1Safe = (s) => Array.from(s, (ch) => (ch.codePointAt(0) > 0xff ? "-" : ch)).join("");

// Escribir XML (latin1 para el caso ISO; utf8 para el resto).
const bytesByFile = {};
for (const c of cases) {
  const buf = c.enc === "latin1" ? Buffer.from(toLatin1Safe(c.xml), "latin1") : Buffer.from(c.xml, "utf8");
  writeFileSync(join(XML_DIR, c.file), buf);
  bytesByFile[c.file] = new Uint8Array(buf);
}

// ZIP principal: todo JUNIO (mismo mes) — 01..12 (excluye 13 que es mayo).
const junFiles = cases.filter((c) => c.file !== "13-ingreso-mayo.xml").map((c) => c.file);
const packEntries = {};
for (const f of junFiles) packEntries[f] = bytesByFile[f];
writeFileSync(join(ZIP_DIR, "wedge-cfdi-synthetic-pack.zip"), zipSync(packEntries, { level: 6 }));

// ZIP multi-mes: mayo + un junio → dispara el aviso "varios meses".
writeFileSync(join(ZIP_DIR, "wedge-cfdi-multimonth.zip"), zipSync({
  "13-ingreso-mayo.xml": bytesByFile["13-ingreso-mayo.xml"],
  "01-ingreso-pue-mxn.xml": bytesByFile["01-ingreso-pue-mxn.xml"],
}, { level: 6 }));

console.log(`OK: ${cases.length} XML en ${XML_DIR}`);
console.log(`OK: wedge-cfdi-synthetic-pack.zip (${junFiles.length} XML, junio) + wedge-cfdi-multimonth.zip (2 XML, mayo+junio) en ${ZIP_DIR}`);
