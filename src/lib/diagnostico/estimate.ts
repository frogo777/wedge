/**
 * Diagnóstico fiscal SIN cuenta — estimación informativa (Fase 3A).
 *
 * Reutiliza los motores fiscales canónicos (`@/lib/tax/*`). NO inventa cálculos:
 * si falta certeza (sin CFDIs, régimen no confirmado), lo dice y lo marca como
 * "estimado informativo". Wedge prepara; el usuario valida y presenta en SAT.
 *
 * Función PURA: recibe `now`/`period` para ser testeable y SSR-determinista.
 */
import { calcISRBruto, resicoISRRate } from "@/lib/tax/resico";
import { calcHonorariosISR } from "@/lib/tax/honorarios";

export type DiagRegime = "resico_pf" | "honorarios" | "unsure";
export type TriState = "si" | "no" | "unsure";

export interface DiagnosticoInput {
  regime: DiagRegime;
  /** Ingreso aproximado del mes (MXN). */
  ingreso: number;
  /** ¿Tiene gastos con CFDI? */
  gastosCFDI: TriState;
  /** ¿Le retuvieron ISR o IVA? */
  retenciones: TriState;
  /** Periodo "YYYY-MM" del mes a revisar. */
  period: string;
  /** Fecha de referencia para la fecha límite (default: now del caller). */
  now?: Date;
}

export interface DiagnosticoResult {
  regimeLabel: string;
  /** ISR estimado del mes (informativo); null si no hay base suficiente. */
  isrEstimado: number | null;
  /** Tasa RESICO aplicable (solo RESICO); null en otros casos. */
  isrRatePct: number | null;
  isrNota: string;
  /** IVA trasladado estimado (informativo, antes de acreditar); null si no aplica. */
  ivaTrasladado: number | null;
  ivaNota: string;
  deadlineLabel: string;
  daysToDeadline: number | null;
  /** Qué tan "listo" está el mes (0-100). Guest: bajo — faltan CFDIs y validación. */
  readinessPct: number;
  pendientes: string[];
  proximaAccion: string;
  disclaimer: string;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const IVA_RATE = 0.16;

function regimeLabelOf(r: DiagRegime): string {
  return r === "resico_pf" ? "RESICO PF"
    : r === "honorarios" ? "Honorarios / Actividad Profesional"
    : "Régimen por confirmar";
}

/** Fecha límite: día 17 del mes SIGUIENTE al periodo (declaración mensual). */
function deadlineFor(period: string, now: Date): { label: string; days: number | null } {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return { label: "día 17 del mes siguiente", days: null };
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10); // 1-12
  let dy = year, dm = month + 1;
  if (dm > 12) { dm = 1; dy += 1; }
  const deadline = new Date(dy, dm - 1, 17);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((deadline.getTime() - start.getTime()) / 86_400_000);
  return { label: `17 de ${MESES[dm - 1]}`, days };
}

export function estimateDiagnostico(input: DiagnosticoInput): DiagnosticoResult {
  const now = input.now ?? new Date();
  const ingreso = Math.max(0, input.ingreso || 0);
  const regimeLabel = regimeLabelOf(input.regime);

  // ── ISR estimado (informativo) ──
  let isrEstimado: number | null = null;
  let isrRatePct: number | null = null;
  let isrNota = "";

  if (input.regime === "honorarios") {
    // Sin gastos confirmados aún → base = ingreso (estimación alta y conservadora).
    const r = calcHonorariosISR({ ingresosCobrados: ingreso, gastosDeducibles: 0, periodo: input.period });
    isrEstimado = r.isr;
    isrNota = "Estimado por tarifa Art. 96 LISR sin deducciones. Tus gastos con CFDI lo bajan.";
  } else {
    // RESICO PF (o régimen por confirmar → se asume RESICO como referencia).
    isrRatePct = Math.round(resicoISRRate(ingreso) * 1000) / 10; // p.ej. 2.0
    isrEstimado = calcISRBruto(ingreso).isr;
    isrNota = input.regime === "resico_pf"
      ? `Tasa RESICO ${isrRatePct}% sobre ingresos efectivamente cobrados (Art. 113-E LISR).`
      : `Referencia asumiendo RESICO PF (${isrRatePct}%). Confirma tu régimen para afinarlo.`;
  }

  // ── IVA (informativo) ──
  const ivaTrasladado = ingreso > 0 ? Math.round(ingreso * IVA_RATE) : null;
  let ivaNota: string;
  if (input.gastosCFDI === "si") {
    ivaNota = "Revisa tus CFDIs de gastos: el IVA acreditable baja lo que pagas.";
  } else if (input.gastosCFDI === "no") {
    ivaNota = "Sin gastos con CFDI no hay IVA acreditable este mes. Revisa si te falta facturar algún gasto.";
  } else {
    ivaNota = "IVA por revisar: lo calculamos cuando traigas tus CFDIs de gastos.";
  }

  // ── Fecha límite ──
  const dl = deadlineFor(input.period, now);

  // ── Nivel de preparación (guest: bajo — faltan CFDIs y validación) ──
  let readiness = 15;
  if (input.regime !== "unsure") readiness += 10;
  if (ingreso > 0) readiness += 10;
  if (input.gastosCFDI !== "unsure") readiness += 8;
  if (input.retenciones !== "unsure") readiness += 7;
  const readinessPct = Math.min(45, readiness); // sin CFDIs reales no se llega a "listo"

  // ── Pendientes (qué falta para completar el mes) ──
  const pendientes: string[] = [];
  if (input.regime === "unsure") pendientes.push("Confirmar tu régimen fiscal");
  pendientes.push("Traer tus CFDIs (XML/ZIP o conectando SAT)");
  pendientes.push("Confirmar tus ingresos cobrados");
  if (input.gastosCFDI !== "no") pendientes.push("Revisar IVA acreditable");
  if (input.retenciones === "si") pendientes.push("Validar tus retenciones");

  const proximaAccion = "Guarda tu mes fiscal y trae tus CFDIs para afinar el cálculo.";
  const disclaimer = "Cálculo informativo, no asesoría fiscal. Wedge prepara; tú validas y presentas en el SAT.";

  return {
    regimeLabel,
    isrEstimado,
    isrRatePct,
    isrNota,
    ivaTrasladado,
    ivaNota,
    deadlineLabel: dl.label,
    daysToDeadline: dl.days,
    readinessPct,
    pendientes,
    proximaAccion,
    disclaimer,
  };
}

/** Formato MXN compacto sin centavos. */
export function mxn(n: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(Math.round(n));
}
