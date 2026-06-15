/**
 * CFDI Engine — parse layer (Fase 5A).
 *
 * Envuelve el parser CFDI 4.0 ya existente (`@/lib/cfdi-parser`) — NO reescribe el
 * parser. Aporta un resultado discriminado fácil de consumir y manejo de lotes.
 *
 * Reutilizar el parser probado (dual DOMParser/regex, server-safe, rechazo 3.3,
 * preflight de acuses) es deliberado: evita divergencia y bugs de un parser nuevo.
 */

import { parseCFDI, parseCFDIs, type ParsedCFDI, type ParseResult } from "@/lib/cfdi-parser";

export type CfdiParseOk = { ok: true; cfdi: ParsedCFDI };
export type CfdiParseErr = { ok: false; error: string };
export type CfdiParseOutcome = CfdiParseOk | CfdiParseErr;

function isError(r: ParseResult): r is { error: string } {
  return typeof (r as { error?: unknown }).error === "string";
}

/** Parsea UN comprobante. Falla seguro: nunca lanza, devuelve `{ ok:false, error }`. */
export function parseOne(xml: string): CfdiParseOutcome {
  try {
    const r = parseCFDI(xml);
    if (isError(r)) return { ok: false, error: r.error };
    return { ok: true, cfdi: r };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al parsear XML." };
  }
}

/**
 * Parsea uno o varios comprobantes (un XML puede envolver varios Comprobante).
 * Devuelve un outcome por comprobante; los inválidos quedan como `{ ok:false }`.
 */
export function parseMany(xml: string): CfdiParseOutcome[] {
  try {
    return parseCFDIs(xml).map((r) =>
      isError(r) ? { ok: false as const, error: r.error } : { ok: true as const, cfdi: r },
    );
  } catch (e) {
    return [{ ok: false, error: e instanceof Error ? e.message : "Error al parsear XML." }];
  }
}

/** Parsea una lista de XML sueltos (p. ej. de un ZIP descomprimido). */
export function parseBatch(xmls: string[]): CfdiParseOutcome[] {
  return xmls.flatMap((xml) => parseMany(xml));
}
