/**
 * Timezone helpers — todo cálculo fiscal opera en hora de Ciudad de México.
 *
 * Por qué: Vercel corre en UTC. SAT, fechas de vencimiento (día 17), CFDIs
 * y la UI todos asumen hora local de México. Si en el servidor usamos
 * `new Date().toISOString().slice(0, 10)` para "hoy", a las 8pm CDMX el
 * 30-abr el resultado es "2026-05-01" (UTC). Esto sesga:
 *   - Default de fecha en formularios (la tx queda en el mes que NO toca).
 *   - Detección de declaración vencida (marca overdue 6h antes).
 *   - Filtros mensuales en CFDIs sin fecha explícita.
 *
 * México adoptó hora estándar permanente (UTC-6) en oct-2022 (DOF
 * 28-jul-2022, eliminación del horario de verano para casi todo el país).
 * Quintana Roo está en UTC-5, Baja California en UTC-7/-8, pero >95% del
 * país y la SAT operan en hora del centro. Hardcodeamos UTC-6 — si en el
 * futuro se requiere multi-zona, este es el único lugar a tocar.
 *
 * Implementación: convertimos Date a componentes de zona MX usando
 * Intl.DateTimeFormat (presente en todos los Node/runtime modernos), no
 * `Date.toLocaleString` que tiene comportamiento inconsistente entre
 * versiones de Node. Esto evita la trampa de "el server cambió de TZ y
 * todo dejó de funcionar".
 */

const MX_TZ = "America/Mexico_City";

const MX_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: MX_TZ,
  year:    "numeric",
  month:   "2-digit",
  day:     "2-digit",
  hour:    "2-digit",
  minute:  "2-digit",
  second:  "2-digit",
  hour12:  false,
});

interface MxParts {
  year:   number;
  month:  number; // 1-12
  day:    number;
  hour:   number;
  minute: number;
  second: number;
}

function partsInMexico(date: Date): MxParts {
  const out: Partial<MxParts> = {};
  for (const p of MX_FORMATTER.formatToParts(date)) {
    if (p.type === "year")   out.year   = parseInt(p.value, 10);
    if (p.type === "month")  out.month  = parseInt(p.value, 10);
    if (p.type === "day")    out.day    = parseInt(p.value, 10);
    if (p.type === "hour")   out.hour   = parseInt(p.value, 10) === 24 ? 0 : parseInt(p.value, 10);
    if (p.type === "minute") out.minute = parseInt(p.value, 10);
    if (p.type === "second") out.second = parseInt(p.value, 10);
  }
  return {
    year:   out.year   ?? 1970,
    month:  out.month  ?? 1,
    day:    out.day    ?? 1,
    hour:   out.hour   ?? 0,
    minute: out.minute ?? 0,
    second: out.second ?? 0,
  };
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** "YYYY-MM-DD" del momento dado en hora CDMX. Default: ahora. */
export function isoDateMexico(date: Date = new Date()): string {
  const p = partsInMexico(date);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/** "YYYY-MM" (periodo SAT) del momento dado en hora CDMX. */
export function isoPeriodoMexico(date: Date = new Date()): string {
  const p = partsInMexico(date);
  return `${pad(p.year, 4)}-${pad(p.month)}`;
}

/** Año (4 dígitos) en hora CDMX. */
export function yearInMexico(date: Date = new Date()): number {
  return partsInMexico(date).year;
}

/** Mes (1-12) en hora CDMX. */
export function monthInMexico(date: Date = new Date()): number {
  return partsInMexico(date).month;
}

/** Día del mes (1-31) en hora CDMX. */
export function dayInMexico(date: Date = new Date()): number {
  return partsInMexico(date).day;
}
