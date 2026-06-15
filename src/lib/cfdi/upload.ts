/**
 * CFDI Engine — carga segura de XML/ZIP (Fase 5B).
 *
 * Utilidades CLIENT-ONLY para que un usuario autenticado cargue XML/ZIP reales en su
 * navegador y obtenga un PREVIEW temporal del Mes Fiscal. El XML NUNCA sale del dispositivo
 * (no hay red, no hay persistencia). Las funciones que tocan File/Blob solo se llaman en
 * handlers del cliente; el módulo no ejecuta APIs de navegador al importarse (SSR-safe).
 *
 * Seguridad: límites duros (tamaño/entradas/total), rechazo de ZIP anidado, no se confía en
 * el filename (el parser valida el contenido), el XML solo se parsea como texto (nunca se
 * ejecuta). Sin persistencia, sin SAT, sin e.firma/CIEC. "Wedge prepara; tú validas en SAT."
 */

import { unzipSync } from "fflate";
import type { ParsedCFDI } from "@/lib/cfdi-parser";
import { parseMany } from "./parse";
import { normalizeCfdi } from "./normalize";
import { periodsPresent, cfdisForPeriod } from "./month";
import { fiscalMonthFromCfdis, type FiscalMonthFromCfdisContext } from "@/lib/mes/from-cfdis";
import type { NormalizedCfdi } from "./types";
import type { FiscalMonth } from "@/lib/mes/types";

/** Límites de carga (documentados en 05B_XML_ZIP_UPLOAD_PLAN.md §4). */
export const UPLOAD_LIMITS = {
  maxFiles: 20,
  maxXmlBytes: 2 * 1024 * 1024, // 2 MB por XML
  maxZipBytes: 25 * 1024 * 1024, // 25 MB por ZIP
  maxZipEntries: 1000, // # entradas .xml por ZIP
  maxEntryBytes: 8 * 1024 * 1024, // 8 MB por entrada descomprimida
  maxTotalXmlBytes: 64 * 1024 * 1024, // 64 MB de texto XML acumulado
} as const;

export type UploadIssueCode =
  | "extension"
  | "too_many_files"
  | "xml_too_large"
  | "zip_too_large"
  | "too_many_entries"
  | "nested_zip"
  | "no_xml_in_zip"
  | "empty"
  | "read_error"
  | "unreadable_zip"
  | "invalid_cfdi"
  | "total_too_large"
  | "multi_month";

export interface UploadIssue {
  /** Nombre del archivo/entrada afectada (no contiene datos fiscales). */
  file: string;
  code: UploadIssueCode;
  /** Mensaje humano para mostrar al usuario. */
  message: string;
}

interface Payload {
  name: string;
  text: string;
}

function ext(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

function isMacOsxJunk(name: string): boolean {
  return name.startsWith("__MACOSX/") || name.split("/").pop()?.startsWith("._") === true;
}

/** Valida un archivo por extensión y tamaño. Devuelve un issue o null si está bien. */
export function validateCfdiFile(file: File): UploadIssue | null {
  const e = ext(file.name);
  if (e !== ".xml" && e !== ".zip") {
    return { file: file.name, code: "extension", message: "Este archivo no parece un CFDI XML o ZIP." };
  }
  if (file.size === 0) {
    return { file: file.name, code: "empty", message: "Este archivo está vacío." };
  }
  if (e === ".xml" && file.size > UPLOAD_LIMITS.maxXmlBytes) {
    return { file: file.name, code: "xml_too_large", message: "Este XML es muy grande para procesarlo aquí." };
  }
  if (e === ".zip" && file.size > UPLOAD_LIMITS.maxZipBytes) {
    return { file: file.name, code: "zip_too_large", message: "Este ZIP es muy grande para procesarlo aquí." };
  }
  return null;
}

/** Valida una lista de archivos. Aplica el tope de # de archivos. */
export function validateCfdiFiles(files: File[]): { valid: File[]; issues: UploadIssue[] } {
  const issues: UploadIssue[] = [];
  let list = files;
  if (files.length > UPLOAD_LIMITS.maxFiles) {
    issues.push({
      file: "(selección)",
      code: "too_many_files",
      message: `Selecciona máximo ${UPLOAD_LIMITS.maxFiles} archivos a la vez.`,
    });
    list = files.slice(0, UPLOAD_LIMITS.maxFiles);
  }
  const valid: File[] = [];
  for (const f of list) {
    const issue = validateCfdiFile(f);
    if (issue) issues.push(issue);
    else valid.push(f);
  }
  return { valid, issues };
}

/**
 * Decodifica bytes de XML respetando el encoding declarado en el prólogo (R7.3 F2).
 * `file.text()` / `strFromU8` asumen UTF-8 siempre; CFDIs reales de algunos PAC vienen en
 * ISO-8859-1 / Windows-1252 y se verían con mojibake en nombres/descripciones. Sin dependencias
 * (TextDecoder nativo). Montos/RFC son ASCII → el cálculo no cambia; esto arregla el texto.
 */
function sniffXmlEncoding(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return "utf-8"; // BOM
  const n = Math.min(bytes.length, 256);
  let head = "";
  for (let i = 0; i < n; i++) head += String.fromCharCode(bytes[i]);
  const m = /encoding\s*=\s*["']([^"']+)["']/i.exec(head);
  const enc = (m?.[1] || "utf-8").trim().toLowerCase();
  if (enc === "latin1" || enc === "iso8859-1" || enc === "iso-8859-1") return "iso-8859-1";
  if (enc === "cp1252" || enc === "windows-1252") return "windows-1252";
  return enc;
}

export function decodeXmlBytes(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder(sniffXmlEncoding(bytes), { fatal: false }).decode(bytes);
  } catch {
    text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
  // R7.4B: el string ya es Unicode. Si el prólogo aún declara otra codificación
  // (ISO-8859-1 / Windows-1252), el DOMParser del navegador puede RECHAZAR el XML (intenta
  // re-interpretar bytes que ya no existen) → el CFDI se cae en el navegador aunque parsee en
  // Node (regex). Normalizamos la declaración a UTF-8 para que sea consistente con el contenido.
  return text.replace(/(<\?xml[^>]*\bencoding\s*=\s*")[^"]*(")/i, "$1UTF-8$2");
}

/** Lee un archivo .xml como texto, respetando su encoding declarado. Falla seguro. */
export async function readXmlFile(file: File): Promise<Payload | UploadIssue> {
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    return { name: file.name, text: decodeXmlBytes(buf) };
  } catch {
    return { file: file.name, code: "read_error", message: "No pudimos leer este XML." };
  }
}

/**
 * Descomprime un .zip: solo entradas .xml, con límites duros y rechazo de ZIP anidado.
 *
 * ANTI ZIP-BOMB: el `filter` de fflate recibe `originalSize` (tamaño DESCOMPRIMIDO declarado en
 * el header) ANTES de inflar cada entrada; las que exceden `maxEntryBytes`, o que harían superar
 * `maxTotalXmlBytes`/`maxZipEntries`, se OMITEN (no se descomprimen). Así el cap de tamaño
 * descomprimido se aplica antes de asignar memoria, no después.
 * Residual conocido: un ZIP con header falsificado (declara poco, infla mucho) no se detecta por
 * `originalSize`; es un caso raro y, al ser client-only, solo afectaría la propia pestaña del
 * usuario (no hay servidor). Streaming con abort por chunk queda como mejora futura.
 */
export async function readZipFile(file: File): Promise<{ payloads: Payload[]; issues: UploadIssue[] }> {
  const issues: UploadIssue[] = [];
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { payloads: [], issues: [{ file: file.name, code: "read_error", message: "No pudimos leer este ZIP." }] };
  }
  if (bytes.length > UPLOAD_LIMITS.maxZipBytes) {
    return { payloads: [], issues: [{ file: file.name, code: "zip_too_large", message: "Este ZIP es muy grande para procesarlo aquí." }] };
  }

  let nested = false;
  let xmlCount = 0;
  let accepted = 0;
  let declaredTotal = 0;
  let oversizeSkipped = false;

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes, {
      // `false` = NO descomprimir esa entrada (ahorra memoria/CPU). Aquí se aplican los topes.
      filter: (f) => {
        const name = f.name;
        if (ext(name) === ".zip") { nested = true; return false; } // ZIP anidado: se detecta aunque venga camuflado
        if (isMacOsxJunk(name)) return false;
        if (ext(name) !== ".xml") return false;
        xmlCount++;
        if (f.originalSize > UPLOAD_LIMITS.maxEntryBytes) { oversizeSkipped = true; return false; }
        if (accepted >= UPLOAD_LIMITS.maxZipEntries) return false;
        if (declaredTotal + f.originalSize > UPLOAD_LIMITS.maxTotalXmlBytes) return false;
        declaredTotal += f.originalSize;
        accepted++;
        return true;
      },
    });
  } catch {
    return { payloads: [], issues: [{ file: file.name, code: "unreadable_zip", message: "El ZIP está dañado o no se pudo leer." }] };
  }

  // Rechazar ZIP anidado (vector de zip-bomb / confusión) — sobre la lista COMPLETA.
  if (nested) {
    return { payloads: [], issues: [{ file: file.name, code: "nested_zip", message: "Este ZIP contiene otro ZIP. Sube los XML o un ZIP simple." }] };
  }
  if (xmlCount === 0) {
    return { payloads: [], issues: [{ file: file.name, code: "no_xml_in_zip", message: "El ZIP no contiene archivos .xml." }] };
  }
  if (xmlCount > UPLOAD_LIMITS.maxZipEntries) {
    issues.push({ file: file.name, code: "too_many_entries", message: `El ZIP tiene demasiados archivos (máximo ${UPLOAD_LIMITS.maxZipEntries}).` });
  }
  if (oversizeSkipped) {
    issues.push({ file: file.name, code: "xml_too_large", message: "Algunos XML del ZIP eran muy grandes y se omitieron." });
  }

  const payloads: Payload[] = [];
  for (const [name, data] of Object.entries(entries)) {
    try {
      payloads.push({ name: `${file.name} › ${name}`, text: decodeXmlBytes(data) });
    } catch {
      issues.push({ file: `${file.name} › ${name}`, code: "read_error", message: "No pudimos decodificar un XML del ZIP." });
    }
  }
  return { payloads, issues };
}

/**
 * Infiere el RFC del usuario SIN pedirlo: es el RFC que aparece en más CFDIs (como emisor o
 * receptor). Para un lote de CFDIs propios, el usuario aparece en todos. Heurística — el
 * preview es informativo y el usuario valida.
 */
export function inferUserRfc(list: ParsedCFDI[]): string | undefined {
  const counts: Record<string, number> = {};
  for (const c of list) {
    for (const rfc of [c.emisor?.rfc, c.receptor?.rfc]) {
      const r = (rfc || "").trim().toUpperCase();
      if (r) counts[r] = (counts[r] ?? 0) + 1;
    }
  }
  let best: string | undefined;
  let max = 0;
  let tied = false;
  for (const [r, n] of Object.entries(counts)) {
    if (n > max) { max = n; best = r; tied = false; }
    else if (n === max) { tied = true; }
  }
  // Empate (lote ambiguo, p. ej. todo entre el usuario y UNA contraparte, o un solo CFDI):
  // NO adivinar — devolver undefined → dirección "desconocido" → no se suma, se marca revisión.
  // Evita inflar ingresos por inferencia errónea (resultado determinista, no depende del orden).
  return tied ? undefined : best;
}

/** Lee + parsea + normaliza una selección de archivos a NormalizedCfdi[]. Client-only. */
export async function parseUploadedCfdis(
  files: File[],
  opts: { userRfc?: string } = {},
): Promise<{ cfdis: NormalizedCfdi[]; issues: UploadIssue[] }> {
  const { valid, issues } = validateCfdiFiles(files);

  // 1) Expandir a payloads de texto XML (xml directo o entradas de zip).
  const payloads: Payload[] = [];
  for (const f of valid) {
    if (ext(f.name) === ".zip") {
      const r = await readZipFile(f);
      payloads.push(...r.payloads);
      issues.push(...r.issues);
    } else {
      const r = await readXmlFile(f);
      if ("text" in r) payloads.push(r);
      else issues.push(r);
    }
  }

  // 2) Parsear cada payload (conservando el nombre para errores humanos).
  const parsed: { name: string; cfdi: ParsedCFDI }[] = [];
  for (const p of payloads) {
    for (const outcome of parseMany(p.text)) {
      if (outcome.ok) parsed.push({ name: p.name, cfdi: outcome.cfdi });
      else issues.push({ file: p.name, code: "invalid_cfdi", message: humanizeParseError(outcome.error) });
    }
  }

  // 3) Inferir el RFC del usuario y normalizar.
  const userRfc = opts.userRfc ?? inferUserRfc(parsed.map((p) => p.cfdi));
  // Garantiza `id` únicos: dos CFDIs SIN timbre con misma fecha/total/emisor comparten hash
  // (deriveId); desempatamos por orden de carga para que una decisión no afecte a ambos.
  const seen = new Map<string, number>();
  const cfdis = parsed.map((p) => {
    const c = normalizeCfdi(p.cfdi, { userRfc, source: "xml" });
    const n = (seen.get(c.id) ?? 0) + 1;
    seen.set(c.id, n);
    return n === 1 ? c : { ...c, id: `${c.id}-${n}` };
  });

  return { cfdis, issues };
}

export interface UploadPreviewResult {
  ok: boolean;
  month: FiscalMonth | null;
  /** CFDIs del periodo previsualizado (normalizados; coinciden con las métricas del mes). */
  cfdis: NormalizedCfdi[];
  /** CFDIs del periodo previsualizado (coincide con las métricas del mes). */
  count: number;
  /** CFDIs totales leídos (todos los meses). */
  totalParsed: number;
  /** Periodos YYYY-MM detectados en la carga (más reciente primero). */
  periodsDetected: string[];
  issues: UploadIssue[];
}

/** Periodo MÁS FRECUENTE (igual criterio que fiscalMonthFromCfdis) para que count y mes coincidan. */
function dominantPeriodOf(cfdis: NormalizedCfdi[]): string {
  const counts: Record<string, number> = {};
  for (const c of cfdis) if (c.monthKey) counts[c.monthKey] = (counts[c.monthKey] ?? 0) + 1;
  let best = "";
  let max = -1;
  for (const [k, v] of Object.entries(counts)) if (v > max) { max = v; best = k; }
  return best;
}

/**
 * Pipeline completo: archivos → preview de Mes Fiscal (temporal, en cliente).
 * No persiste nada. Devuelve month=null si no se detectó ningún CFDI válido.
 *
 * El preview es de UN mes (el dominante): `count` cuenta solo ese mes y `periodsDetected`
 * expone si había varios, para que la UI avise (no se descartan meses en silencio).
 */
export async function buildPreviewFromUploadedCfdis(
  files: File[],
  context: FiscalMonthFromCfdisContext = {},
): Promise<UploadPreviewResult> {
  const { cfdis, issues } = await parseUploadedCfdis(files);
  if (cfdis.length === 0) {
    return { ok: false, month: null, cfdis: [], count: 0, totalParsed: 0, periodsDetected: [], issues };
  }
  const period = context.period || dominantPeriodOf(cfdis);
  const month = fiscalMonthFromCfdis(cfdis, { ...context, period });
  const periodCfdis = period ? cfdisForPeriod(cfdis, period) : cfdis;
  return {
    ok: true, month, cfdis: periodCfdis, count: periodCfdis.length,
    totalParsed: cfdis.length, periodsDetected: periodsPresent(cfdis), issues,
  };
}

/**
 * Vista de un CFDI segura para cliente: SIN UUID crudo, SIN RFC completo, SIN XML crudo.
 * Incluye `paymentMethod` (PUE/PPD) y `paymentForm` (catálogo c_FormaPago) — NO son PII — para
 * poder recalcular el Mes Fiscal desde el preview redactado (Fase 5D) sin guardar datos sensibles.
 */
export interface RedactedCfdi {
  id: string;
  type: NormalizedCfdi["type"];
  direction: NormalizedCfdi["direction"];
  status: NormalizedCfdi["status"];
  monthKey: string;
  subtotal: number;
  total: number;
  currency: string;
  paymentMethod: string | null;
  paymentForm: string | null;
  /** UsoCFDI (catálogo c_UsoCFDI; NO es PII) — para gatear deducibilidad al recomputar (R7.3 F3). */
  cfdiUse: string;
  taxes: NormalizedCfdi["taxes"];
  conceptCount: number;
  warnings: string[];
}

export function redactCfdiForClient(cfdi: NormalizedCfdi): RedactedCfdi {
  return {
    id: cfdi.id,
    type: cfdi.type,
    direction: cfdi.direction,
    status: cfdi.status,
    monthKey: cfdi.monthKey,
    subtotal: cfdi.subtotal,
    total: cfdi.total,
    currency: cfdi.currency,
    paymentMethod: cfdi.paymentMethod,
    paymentForm: cfdi.paymentForm,
    cfdiUse: cfdi.cfdiUse,
    taxes: cfdi.taxes,
    conceptCount: cfdi.concepts.length,
    warnings: cfdi.warnings,
  };
}

/** Traduce errores técnicos del parser a lenguaje humano. */
function humanizeParseError(error: string): string {
  const e = error.toLowerCase();
  if (e.includes("3.3")) return "Este CFDI es versión 3.3; Wedge procesa CFDI 4.0.";
  if (e.includes("acuse")) return "Este archivo es un acuse del SAT, no un CFDI.";
  if (e.includes("cancelaci")) return "Este archivo es una solicitud/respuesta de cancelación, no un CFDI.";
  if (e.includes("comprobante")) return "Este archivo no parece un CFDI válido.";
  return "No pudimos leer este XML.";
}
