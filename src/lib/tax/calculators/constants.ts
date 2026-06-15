/**
 * Constantes fiscales compartidas entre calculadoras.
 *
 * UMA: valores publicados por INEGI vigentes desde el 1° de febrero
 * de cada año (DOF 09-ene-2026 para UMA 2026, DOF 10-ene-2025 para UMA 2025).
 *
 * UMA 2026 (vigente desde 1-feb-2026, +3.69% vs 2025):
 *   - diaria:   $117.31
 *   - mensual:  $3,566.22
 *   - anual:    $42,794.64
 *
 * UMA 2025 (vigente 1-feb-2025 hasta 31-ene-2026):
 *   - diaria:   $113.14
 *   - mensual:  $3,439.46
 *   - anual:    $41,273.52
 *
 * NOTA SAT: la UMA cambia el 1° de febrero, no el 1° de enero. Para
 * cálculos sobre periodos que cruzan febrero, usa el valor vigente
 * en la fecha del hecho generador (devengo o cobro, según régimen).
 */
export const UMA_DIARIA_2025 = 113.14;
export const UMA_MENSUAL_2025 = 3_439.46;
export const UMA_ANUAL_2025 = 41_273.52;

export const UMA_DIARIA_2026 = 117.31;
export const UMA_MENSUAL_2026 = 3_566.22;
export const UMA_ANUAL_2026 = 42_794.64;

/* ─── Year-aware UMA lookup ────────────────────────────────
 * La UMA cambia el 1° de febrero. Para una fecha dada, devuelve el
 * valor vigente en ese momento (enero usa la UMA del año anterior).
 *
 * Ejemplo: para 15-ene-2026 → UMA 2025 ($113.14). Para 1-feb-2026 → UMA 2026.
 */
export interface UMAValues {
  diaria:  number;
  mensual: number;
  anual:   number;
  year:    number;
}

const UMA_BY_YEAR: Record<number, UMAValues> = {
  2025: { diaria: UMA_DIARIA_2025, mensual: UMA_MENSUAL_2025, anual: UMA_ANUAL_2025, year: 2025 },
  2026: { diaria: UMA_DIARIA_2026, mensual: UMA_MENSUAL_2026, anual: UMA_ANUAL_2026, year: 2026 },
};

/* Lee año/mes de una Date en hora CDMX, sin acoplarse al TZ del proceso.
 * Misma lógica que `src/lib/tax/tz.ts` pero local para evitar dependencia
 * cíclica (este archivo es importado por muchos otros). */
function mxParts(d: Date): { year: number; month: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
  });
  let y = 1970, m = 1;
  for (const p of fmt.formatToParts(d)) {
    if (p.type === "year")  y = parseInt(p.value, 10);
    if (p.type === "month") m = parseInt(p.value, 10);
  }
  return { year: y, month: m };
}

/** UMA vigente en una fecha. Acepta:
 *   - ISO `YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ss(Z)`
 *   - Periodo `YYYY-MM`
 *   - Date (componentes en hora CDMX)
 *
 *  Para strings extraemos año y mes con regex — sin `new Date(str)` para
 *  no caer en trampas de TZ (un Date construido de string ISO sin "Z" se
 *  parsea como local, y los getters UTC pueden cruzar el día). La regla
 *  SAT solo depende de año+mes; día y hora no influyen.
 *
 *  Para Date, leemos los componentes en hora de Ciudad de México vía
 *  `Intl.DateTimeFormat` — esto hace que `getCurrentUMA()` cambie
 *  exactamente a las 00:00 CDMX del 1° de febrero (no 6 h antes en UTC).
 */
export function getUMAForDate(date: string | Date): UMAValues {
  let year: number;
  let month: number; // 1-12
  if (typeof date === "string") {
    const m = /^(\d{4})-(\d{2})/.exec(date);
    if (!m) {
      // Fallback: intentar parsear y leer en hora MX.
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        return UMA_BY_YEAR[Math.max(...Object.keys(UMA_BY_YEAR).map(Number))];
      }
      const parts = mxParts(d);
      year = parts.year;
      month = parts.month;
    } else {
      year = parseInt(m[1], 10);
      month = parseInt(m[2], 10);
    }
  } else {
    const parts = mxParts(date);
    year = parts.year;
    month = parts.month;
  }
  // Antes de febrero usa la UMA del año anterior (cambio efectivo 1-feb).
  const effectiveYear = month < 2 ? year - 1 : year;
  return UMA_BY_YEAR[effectiveYear]
      ?? UMA_BY_YEAR[Math.max(...Object.keys(UMA_BY_YEAR).map(Number))];
}

/** UMA vigente al "ahora" del servidor — útil para cálculos del periodo
 *  fiscal en curso. Siempre prefiere `getUMAForDate(fecha)` cuando exista
 *  una fecha del hecho generador. */
export function getCurrentUMA(): UMAValues {
  return getUMAForDate(new Date());
}

export const IVA_RATE = 0.16;
