/**
 * CFDI Engine — fixtures FICTICIOS (Fase 5A).
 *
 * ⚠️ TODO aquí es INVENTADO para demo/tests locales:
 *  - RFCs sintéticos (DEMO/EMP/PRO/RET... claramente no reales).
 *  - UUIDs placeholder secuenciales (00000000-0000-4000-8000-0000000000NN), NO UUIDs reales.
 *  - Nombres ficticios ("Persona Demostracion", "Cliente Demo SA de CV").
 *  - Sin datos personales, sin e.firma, sin CIEC, sin XML real de ningún contribuyente.
 *
 * Un test (fixtures.vitest.ts) verifica que no haya patrones de datos reales prohibidos.
 */

import { parseOne } from "./parse";
import { normalizeCfdi } from "./normalize";
import type { NormalizedCfdi, CfdiExternalMeta } from "./types";

/** RFC ficticio del usuario demo (persona física). */
export const DEMO_USER_RFC = "DEMO010101AB1";
const RFC_CLIENTE = "EMP010101AB2"; // cliente moral ficticio
const RFC_PROVEEDOR = "PRO010101CD3"; // proveedor ficticio
const RFC_MORAL_RET = "RET010101EF4"; // moral que retiene (ficticio)

function n2(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

interface CfdiXmlOpts {
  tipo: "I" | "E";
  fecha: string;
  uuid?: string | null;
  subtotal: number;
  ivaTrasladado?: number;
  isrRetenido?: number;
  ivaRetenido?: number;
  metodoPago?: "PUE" | "PPD";
  formaPago?: string;
  emisorRfc: string;
  emisorNombre: string;
  emisorRegimen?: string;
  receptorRfc: string;
  receptorNombre: string;
  receptorUso?: string;
  receptorRegimen?: string;
  descripcion?: string;
}

/** Genera un CFDI 4.0 ficticio mínimo pero parseable (I o E). */
function cfdiXml(o: CfdiXmlOpts): string {
  const iva = o.ivaTrasladado ?? 0;
  const isrRet = o.isrRetenido ?? 0;
  const ivaRet = o.ivaRetenido ?? 0;
  const total = o.subtotal + iva - isrRet - ivaRet;

  const trasladosConcepto =
    iva > 0
      ? `<cfdi:Traslados><cfdi:Traslado Base="${n2(o.subtotal)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${n2(iva)}"/></cfdi:Traslados>`
      : "";
  const retencionesConcepto =
    isrRet > 0 || ivaRet > 0
      ? `<cfdi:Retenciones>${isrRet > 0 ? `<cfdi:Retencion Base="${n2(o.subtotal)}" Impuesto="001" Importe="${n2(isrRet)}"/>` : ""}${ivaRet > 0 ? `<cfdi:Retencion Base="${n2(o.subtotal)}" Impuesto="002" Importe="${n2(ivaRet)}"/>` : ""}</cfdi:Retenciones>`
      : "";
  const conceptoImpuestos =
    trasladosConcepto || retencionesConcepto
      ? `<cfdi:Impuestos>${trasladosConcepto}${retencionesConcepto}</cfdi:Impuestos>`
      : "";

  const docTraslados =
    iva > 0
      ? `<cfdi:Traslados><cfdi:Traslado Base="${n2(o.subtotal)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${n2(iva)}"/></cfdi:Traslados>`
      : "";
  const docRetenciones =
    isrRet > 0 || ivaRet > 0
      ? `<cfdi:Retenciones>${isrRet > 0 ? `<cfdi:Retencion Impuesto="001" Importe="${n2(isrRet)}"/>` : ""}${ivaRet > 0 ? `<cfdi:Retencion Impuesto="002" Importe="${n2(ivaRet)}"/>` : ""}</cfdi:Retenciones>`
      : "";
  const docImpuestos =
    docTraslados || docRetenciones
      ? `<cfdi:Impuestos${isrRet + ivaRet > 0 ? ` TotalImpuestosRetenidos="${n2(isrRet + ivaRet)}"` : ""}${iva > 0 ? ` TotalImpuestosTrasladados="${n2(iva)}"` : ""}>${docRetenciones}${docTraslados}</cfdi:Impuestos>`
      : "";

  const timbre = o.uuid
    ? `<cfdi:Complemento><tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="${o.uuid}" FechaTimbrado="${o.fecha}"/></cfdi:Complemento>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Fecha="${o.fecha}" SubTotal="${n2(o.subtotal)}" Total="${n2(total)}" Moneda="MXN" TipoDeComprobante="${o.tipo}"${o.metodoPago ? ` MetodoPago="${o.metodoPago}"` : ""}${o.formaPago ? ` FormaPago="${o.formaPago}"` : ""}>
  <cfdi:Emisor Rfc="${o.emisorRfc}" Nombre="${o.emisorNombre}" RegimenFiscal="${o.emisorRegimen ?? "626"}"/>
  <cfdi:Receptor Rfc="${o.receptorRfc}" Nombre="${o.receptorNombre}" UsoCFDI="${o.receptorUso ?? "G03"}" RegimenFiscalReceptor="${o.receptorRegimen ?? "601"}"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="E48" Descripcion="${o.descripcion ?? "Servicios profesionales (ficticio)"}" ValorUnitario="${n2(o.subtotal)}" Importe="${n2(o.subtotal)}">
      ${conceptoImpuestos}
    </cfdi:Concepto>
  </cfdi:Conceptos>
  ${docImpuestos}
  ${timbre}
</cfdi:Comprobante>`;
}

/* ─── Fixtures individuales (claves para tests) ──────────────────────── */

/** 1) Ingreso RESICO con IVA trasladado (PUE) — emitido por el usuario. */
export const XML_INGRESO_PUE = cfdiXml({
  tipo: "I", fecha: "2026-06-04T10:00:00", uuid: "00000000-0000-4000-8000-000000000001",
  subtotal: 18000, ivaTrasladado: 2880, metodoPago: "PUE", formaPago: "03",
  emisorRfc: DEMO_USER_RFC, emisorNombre: "Persona Demostracion",
  receptorRfc: RFC_CLIENTE, receptorNombre: "Cliente Demo SA de CV",
  descripcion: "Servicios de diseno (ficticio)",
});

/** 1b) Segundo ingreso PUE (para "confirmar 2 ingresos"). */
export const XML_INGRESO_PUE_2 = cfdiXml({
  tipo: "I", fecha: "2026-06-11T12:00:00", uuid: "00000000-0000-4000-8000-000000000002",
  subtotal: 12000, ivaTrasladado: 1920, metodoPago: "PUE", formaPago: "03",
  emisorRfc: DEMO_USER_RFC, emisorNombre: "Persona Demostracion",
  receptorRfc: RFC_CLIENTE, receptorNombre: "Cliente Demo SA de CV",
  descripcion: "Consultoria (ficticio)",
});

/** 2) Gasto con IVA acreditable posible (PUE) — recibido por el usuario. */
export const XML_GASTO_IVA = cfdiXml({
  tipo: "I", fecha: "2026-06-08T09:00:00", uuid: "00000000-0000-4000-8000-000000000003",
  subtotal: 4000, ivaTrasladado: 640, metodoPago: "PUE", formaPago: "03",
  emisorRfc: RFC_PROVEEDOR, emisorNombre: "Proveedor Ficticio SA",
  receptorRfc: DEMO_USER_RFC, receptorNombre: "Persona Demostracion",
  descripcion: "Software / suscripcion (ficticio)",
});

/** 3a) Ingreso con retención ISR RESICO (1.25%) — moral que retiene. */
export const XML_INGRESO_RET_RESICO = cfdiXml({
  tipo: "I", fecha: "2026-06-09T11:00:00", uuid: "00000000-0000-4000-8000-000000000004",
  subtotal: 20000, ivaTrasladado: 3200, isrRetenido: 250, metodoPago: "PUE", formaPago: "03",
  emisorRfc: DEMO_USER_RFC, emisorNombre: "Persona Demostracion",
  receptorRfc: RFC_MORAL_RET, receptorNombre: "Contratante Moral Demo SA de CV",
  descripcion: "Servicios a persona moral (ficticio)",
});

/** 3b) Retención ISR + IVA (caso honorarios) — fixture de test para ambos impuestos. */
export const XML_RETENCION_ISR_IVA = cfdiXml({
  tipo: "I", fecha: "2026-06-09T11:30:00", uuid: "00000000-0000-4000-8000-000000000009",
  subtotal: 20000, ivaTrasladado: 3200, isrRetenido: 2000, ivaRetenido: 2133.33,
  metodoPago: "PUE", formaPago: "03",
  emisorRfc: DEMO_USER_RFC, emisorNombre: "Persona Demostracion",
  receptorRfc: RFC_MORAL_RET, receptorNombre: "Contratante Moral Demo SA de CV",
  descripcion: "Honorarios a persona moral (ficticio)",
});

/** 4) Ingreso cancelado (la cancelación se aplica por metadata, no por XML). */
export const XML_INGRESO_CANCELADO = cfdiXml({
  tipo: "I", fecha: "2026-06-06T15:00:00", uuid: "00000000-0000-4000-8000-000000000008",
  subtotal: 8000, ivaTrasladado: 1280, metodoPago: "PUE", formaPago: "03",
  emisorRfc: DEMO_USER_RFC, emisorNombre: "Persona Demostracion",
  receptorRfc: RFC_CLIENTE, receptorNombre: "Cliente Demo SA de CV",
  descripcion: "Servicio cancelado (ficticio)",
});

/** 5) Ingreso PPD que requiere complemento de pago (sin REP asociado). */
export const XML_INGRESO_PPD = cfdiXml({
  tipo: "I", fecha: "2026-06-10T10:00:00", uuid: "00000000-0000-4000-8000-000000000005",
  subtotal: 15000, ivaTrasladado: 2400, metodoPago: "PPD", formaPago: "99",
  emisorRfc: DEMO_USER_RFC, emisorNombre: "Persona Demostracion",
  receptorRfc: RFC_CLIENTE, receptorNombre: "Cliente Demo SA de CV",
  descripcion: "Proyecto a plazos (ficticio)",
});

/** 6) Egreso / nota de crédito. */
export const XML_EGRESO = cfdiXml({
  tipo: "E", fecha: "2026-06-12T16:00:00", uuid: "00000000-0000-4000-8000-000000000006",
  subtotal: 2000, ivaTrasladado: 320, metodoPago: "PUE", formaPago: "03",
  emisorRfc: DEMO_USER_RFC, emisorNombre: "Persona Demostracion",
  receptorRfc: RFC_CLIENTE, receptorNombre: "Cliente Demo SA de CV",
  descripcion: "Nota de credito (ficticio)",
});

/** 7) Complemento de pago (REP, tipo P) — el periodo correcto es la fechaPago. */
export const XML_PAGO_REP = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:pago20="http://www.sat.gob.mx/Pagos20" Version="4.0" Fecha="2026-06-15T10:00:00" SubTotal="0" Total="0" Moneda="XXX" TipoDeComprobante="P">
  <cfdi:Emisor Rfc="${DEMO_USER_RFC}" Nombre="Persona Demostracion" RegimenFiscal="626"/>
  <cfdi:Receptor Rfc="${RFC_CLIENTE}" Nombre="Cliente Demo SA de CV" UsoCFDI="CP01" RegimenFiscalReceptor="601"/>
  <cfdi:Conceptos><cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago" ValorUnitario="0" Importe="0"/></cfdi:Conceptos>
  <cfdi:Complemento>
    <pago20:Pagos Version="2.0">
      <pago20:Pago FechaPago="2026-06-15T10:00:00" FormaDePagoP="03" MonedaP="MXN" Monto="17400.00">
        <pago20:DoctoRelacionado IdDocumento="00000000-0000-4000-8000-000000000005" MonedaDR="MXN" NumParcialidad="1" ImpSaldoAnt="17400.00" ImpPagado="17400.00" ImpSaldoInsoluto="0.00"/>
      </pago20:Pago>
    </pago20:Pagos>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="00000000-0000-4000-8000-000000000007" FechaTimbrado="2026-06-15T10:05:00"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

/* ─── Conjunto demo coherente (RESICO PF, Junio 2026) ────────────────── */

/** UUIDs con metadata externa (cancelación / complemento). */
const DEMO_META: Record<string, CfdiExternalMeta> = {
  "00000000-0000-4000-8000-000000000008": { satStatus: "cancelado" },
  "00000000-0000-4000-8000-000000000005": { hasComplementoPago: false },
};

const DEMO_XMLS = [
  XML_INGRESO_PUE,
  XML_INGRESO_PUE_2,
  XML_GASTO_IVA,
  XML_INGRESO_RET_RESICO,
  XML_INGRESO_PPD,
  XML_EGRESO,
  XML_INGRESO_CANCELADO,
];

/**
 * Devuelve el conjunto demo ya normalizado (CFDIs ficticios de un freelancer RESICO PF,
 * Junio 2026), con la metadata de cancelación/complemento aplicada. Puro y determinista.
 */
export function getDemoCfdis(): NormalizedCfdi[] {
  const out: NormalizedCfdi[] = [];
  for (const xml of DEMO_XMLS) {
    const r = parseOne(xml);
    if (!r.ok) continue; // un fixture roto no debe tumbar la demo
    const uuid = r.cfdi.timbre?.uuid ?? "";
    out.push(
      normalizeCfdi(r.cfdi, {
        userRfc: DEMO_USER_RFC,
        source: "fixture",
        meta: DEMO_META[uuid],
      }),
    );
  }
  return out;
}
