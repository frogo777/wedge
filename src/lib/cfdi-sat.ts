/**
 * Client-side helper to validate a parsed CFDI against the SAT
 * ConsultaCFDIService via our /api/sat-status proxy.
 */

import type { ParsedCFDI } from "@/lib/cfdi-parser";

export type SATStatusValue = "Vigente" | "Cancelado" | "NoEncontrado" | "Error";

export interface SATStatus {
  status:         SATStatusValue;
  codigoEstatus?: string;
  esCancelable?:  string;
  raw?:           string;
  error?:         string;
  checkedAt:      string; // ISO timestamp
}

export async function validateCFDIWithSAT(cfdi: ParsedCFDI): Promise<SATStatus> {
  const uuid = cfdi.timbre?.uuid || "";
  if (!uuid) {
    return {
      status:    "Error",
      error:     "CFDI sin UUID — no se puede validar con SAT.",
      checkedAt: new Date().toISOString(),
    };
  }
  try {
    const res = await fetch("/api/sat-status", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uuid,
        rfcEmisor:   cfdi.emisor.rfc,
        rfcReceptor: cfdi.receptor.rfc,
        total:       cfdi.total,
      }),
    });
    const data = (await res.json()) as Omit<SATStatus, "checkedAt">;
    return { ...data, checkedAt: new Date().toISOString() };
  } catch (e) {
    return {
      status:    "Error",
      error:     (e as Error)?.message || "Error de red al validar con SAT.",
      checkedAt: new Date().toISOString(),
    };
  }
}

/** Sequential validation with a configurable delay to avoid hammering SAT. */
export async function validateCFDIsSequential(
  cfdis: ParsedCFDI[],
  opts: {
    delayMs?: number;
    onResult?: (idx: number, cfdi: ParsedCFDI, status: SATStatus) => void;
  } = {}
): Promise<SATStatus[]> {
  const delay = opts.delayMs ?? 300;
  const out: SATStatus[] = [];
  for (let i = 0; i < cfdis.length; i++) {
    const c = cfdis[i];
    const status = await validateCFDIWithSAT(c);
    out.push(status);
    opts.onResult?.(i, c, status);
    if (i < cfdis.length - 1 && delay > 0) {
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return out;
}
