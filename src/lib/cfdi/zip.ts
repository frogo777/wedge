/**
 * CFDI Engine — ZIP layer (Fase 5A).
 *
 * Descompresión LOCAL de ZIPs de CFDIs usando `fflate` (dependencia YA declarada en
 * package.json, funciona en browser y server). En 5A solo se usa con ZIPs FICTICIOS
 * (round-trip en tests / demo local). NO hay upload productivo ni límites de tamaño aquí
 * — eso se difiere a Fase 5B (carga real con defensas anti zip-bomb).
 */

import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";

/**
 * Topes defensivos (5A, demo local). El upload real con streaming + defensa completa
 * anti zip-bomb / zip-slip es Fase 5B. El tope de bytes de ENTRADA acota la descompresión.
 */
const MAX_ZIP_BYTES = 25 * 1024 * 1024;   // 25 MB comprimido
const MAX_XML_ENTRIES = 1000;             // # máximo de XML procesados
const MAX_ENTRY_BYTES = 8 * 1024 * 1024;  // 8 MB por XML descomprimido

export interface ZipEntry {
  name: string;
  xml: string;
}

/** Comprime un mapa { "factura.xml": "<cfdi>...</cfdi>" } a bytes ZIP. Para fixtures/tests. */
export function zipCfdis(files: Record<string, string>): Uint8Array {
  const data: Record<string, Uint8Array> = {};
  for (const [name, xml] of Object.entries(files)) {
    data[name] = strToU8(xml);
  }
  return zipSync(data);
}

/**
 * Descomprime un ZIP y devuelve solo las entradas .xml como texto.
 * Falla seguro: si el ZIP es inválido, devuelve [] en vez de lanzar.
 */
export function unzipCfdis(bytes: Uint8Array): ZipEntry[] {
  // Guarda defensiva: rechaza entradas vacías o absurdamente grandes ANTES de descomprimir.
  if (!bytes || bytes.length === 0 || bytes.length > MAX_ZIP_BYTES) return [];
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    return [];
  }
  const out: ZipEntry[] = [];
  for (const [name, content] of Object.entries(files)) {
    if (out.length >= MAX_XML_ENTRIES) break; // tope de entradas procesadas
    if (!/\.xml$/i.test(name)) continue; // ignora PDFs/metadata/otros
    if (content.length > MAX_ENTRY_BYTES) continue; // entrada sospechosamente grande
    try {
      out.push({ name, xml: strFromU8(content) });
    } catch {
      // entrada corrupta: se ignora, no rompe el lote
    }
  }
  return out;
}
