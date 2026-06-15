/**
 * CFDI Engine — normalize layer (Fase 5A).
 *
 * `ParsedCFDI` (modelo crudo del parser) → `NormalizedCfdi` (modelo del motor).
 * Pura y SSR-safe. Enmascara RFCs por privacidad. Deriva `monthKey` y `warnings`
 * sin inventar: si un campo no está en el XML, se anota en `warnings`, no se rellena.
 */

import type { ParsedCFDI } from "@/lib/cfdi-parser";
import { classifyDirection, classifyType, classifyStatus } from "./classify";
import type {
  NormalizedCfdi,
  NormalizedConcept,
  NormalizedCfdiTaxes,
  CfdiExternalMeta,
} from "./types";

export interface NormalizeOptions {
  /** RFC del usuario (para decidir dirección emitido/recibido). Se enmascara, no se persiste. */
  userRfc?: string | null;
  /** Origen del dato. En 5A: "fixture". */
  source?: NormalizedCfdi["source"];
  /** Metadata externa al XML (estatus SAT, complemento, deducibilidad). */
  meta?: CfdiExternalMeta;
}

/** Enmascara un RFC dejando solo prefijo + sufijo: "DEMO010101AB1" → "DEM******B1". */
export function maskRfc(rfc: string | null | undefined): string {
  const r = (rfc || "").trim().toUpperCase();
  if (!r) return "—";
  if (r.length <= 5) return r[0] + "****";
  return `${r.slice(0, 3)}******${r.slice(-2)}`;
}

/** "2026-06-22T10:05:00" → "2026-06". Vacío si la fecha no es parseable. */
export function periodFromIso(iso: string | null | undefined): string {
  const s = (iso || "").trim();
  const m = /^(\d{4})-(\d{2})/.exec(s);
  return m ? `${m[1]}-${m[2]}` : "";
}

/**
 * Id estable NO sensible: hash corto determinista del UUID (o de la fecha+total si no hay
 * timbre). No expone el UUID crudo en la UI. Determinista (sin Date.now/random) para SSR.
 */
function deriveId(parsed: ParsedCFDI): string {
  const seed = parsed.timbre?.uuid || `${parsed.fecha}|${parsed.total}|${parsed.emisor.rfc}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return `cfdi-${(h >>> 0).toString(36)}`;
}

export function normalizeCfdi(parsed: ParsedCFDI, opts: NormalizeOptions = {}): NormalizedCfdi {
  const warnings: string[] = [];

  if (!parsed.timbre?.uuid) warnings.push("Sin timbre fiscal (UUID). Podría no estar timbrado.");
  if (!parsed.fecha) warnings.push("Sin fecha de emisión.");
  if (parsed.moneda && parsed.moneda !== "MXN") {
    warnings.push(`Moneda ${parsed.moneda}: el cálculo asume MXN; revisa el tipo de cambio.`);
  }

  const type = classifyType(parsed.tipoDeComprobante);
  const direction = classifyDirection(parsed, opts.userRfc);

  if (direction === "desconocido") {
    warnings.push("No se pudo determinar si lo emitiste o recibiste (RFC del usuario ausente).");
  }

  // monthKey: para tipo P (REP) el periodo correcto es el de la fechaPago del complemento.
  let monthKey = periodFromIso(parsed.fecha);
  if (type === "pago" && parsed.pagos && parsed.pagos.length > 0) {
    const fp = periodFromIso(parsed.pagos[0].fechaPago);
    if (fp) monthKey = fp;
  }
  if (!monthKey) warnings.push("No se pudo derivar el periodo (YYYY-MM) del CFDI.");

  const taxes: NormalizedCfdiTaxes = {
    ivaTrasladado: parsed.impuestos?.totalIVA ?? 0,
    ivaRetenido: parsed.impuestos?.totalIVARetenido ?? 0,
    isrRetenido: parsed.impuestos?.totalISRRetenido ?? 0,
  };

  const concepts: NormalizedConcept[] = (parsed.conceptos || []).map((c) => ({
    description: c.descripcion,
    claveProdServ: c.claveProdServ,
    amount: c.importe,
  }));

  const status = classifyStatus(parsed, { type, meta: opts.meta, warnings });

  return {
    id: deriveId(parsed),
    uuid: parsed.timbre?.uuid ?? null,
    version: parsed.version,
    type,
    direction,
    issuedAt: parsed.fecha,
    monthKey,
    issuerName: parsed.emisor.nombre,
    issuerRfcMasked: maskRfc(parsed.emisor.rfc),
    receiverName: parsed.receptor.nombre,
    receiverRfcMasked: maskRfc(parsed.receptor.rfc),
    subtotal: parsed.subTotal,
    total: parsed.total,
    currency: parsed.moneda || "MXN",
    paymentMethod: parsed.metodoPago ?? null,
    paymentForm: parsed.formaPago ?? null,
    cfdiUse: parsed.receptor.usoCFDI,
    status,
    taxes,
    concepts,
    source: opts.source ?? "fixture",
    warnings,
  };
}
