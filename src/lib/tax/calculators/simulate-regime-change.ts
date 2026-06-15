/**
 * simulate_regime_change — Simulación de cambio de régimen fiscal PF.
 *
 * Compara la carga fiscal anual entre RESICO PF, Honorarios (Actividad
 * Empresarial y Profesional, Arts. 100-113 LISR) y Régimen General de
 * Personas Morales (Arts. 9-15 LISR). Devuelve recomendación con
 * razonamiento, costo de transición y advertencias.
 *
 * **No es asesoría legal vinculante.** El usuario debe validar con un
 * fiscalista, especialmente si:
 *   - Tiene RESICO < 2 años de antigüedad (no permanencia mínima).
 *   - Cambio implica cambio de RFC (PF → PM).
 *   - Tiene pérdidas fiscales acumuladas (no son trasladables entre regímenes).
 */

import { calcISRBruto } from "@/lib/tax/resico";
import { calcHonorariosISR } from "@/lib/tax/honorarios";

export type RegimeKind = "resico_pf" | "honorarios" | "general_pm";

export interface RegimeSimInput {
  /** Ingresos anuales esperados (MXN) — efectivamente cobrados. */
  ingresos_anuales: number;
  /** Gastos deducibles anuales (con CFDI, estrictamente indispensables). */
  gastos_deducibles: number;
  /** Empleados a cargo (afecta PTU + IMSS — solo relevante para honorarios/general). */
  num_empleados?: number;
  /** Tiempo en RESICO actual (meses). Si < 24 hay penalización por permanencia. */
  meses_en_resico?: number;
  /** ¿Ya cobra clientes PM con retención 1.25% ISR? (relevante honorarios). */
  retencion_clientes_pm?: number;
  /** Beneficiario del estímulo Región Fronteriza (IVA 8%, vs 16% general). */
  iva_frontera?: boolean;
}

export interface RegimeSimRow {
  regimen: RegimeKind;
  display_name: string;
  isr_anual: number;
  iva_neto_estimado: number; // 16% sobre (ingresos - gastos) — cero si exportación
  base_gravable: number;
  carga_fiscal_total: number; // ISR + IVA
  porcentaje_efectivo: number; // carga / ingresos
  notas: string[];
}

export interface RegimeSimResult {
  ok: true;
  inputs: RegimeSimInput;
  rows: RegimeSimRow[];
  recomendacion: {
    regimen: RegimeKind;
    razonamiento: string;
    ahorro_anual_vs_segundo: number;
  };
  advertencias: string[];
}

export interface RegimeSimError {
  ok: false;
  error: string;
}

const LIMITE_RESICO_PF = 3_500_000;
const LIMITE_RESICO_PM = 35_000_000;

const DISPLAY_NAME: Record<RegimeKind, string> = {
  resico_pf: "RESICO Persona Física",
  honorarios: "Honorarios (Actividad Profesional)",
  general_pm: "Régimen General PM",
};

/** ISR anual RESICO PF: aplica la tasa por bracket sobre 1/12 del ingreso anual,
 *  multiplicado por 12. Las tasas son por bracket de ingreso mensual. */
function isrResicoAnual(ingresosAnuales: number): number {
  const r = calcISRBruto(ingresosAnuales / 12);
  return round2(r.isr * 12);
}

/** ISR anual Honorarios: aplica la tabla del Art. 96 LISR sobre la base
 *  mensualizada y multiplica por 12. */
function isrHonorariosAnual(baseAnual: number): number {
  if (baseAnual <= 0) return 0;
  const r = calcHonorariosISR({ ingresosCobrados: baseAnual / 12, gastosDeducibles: 0 });
  return round2(r.isr * 12);
}

export function simulateRegimeChange(
  input: RegimeSimInput,
): RegimeSimResult | RegimeSimError {
  const ingresos = Number(input.ingresos_anuales);
  const gastos = Number(input.gastos_deducibles ?? 0);

  if (!Number.isFinite(ingresos) || ingresos <= 0) {
    return { ok: false, error: "ingresos_anuales debe ser número positivo" };
  }
  if (!Number.isFinite(gastos) || gastos < 0) {
    return { ok: false, error: "gastos_deducibles debe ser número >= 0" };
  }

  const advertencias: string[] = [];
  const rows: RegimeSimRow[] = [];
  // Tasa IVA aplicable a este simulador (16% general, 8% frontera).
  const ivaRate = input.iva_frontera === true ? 0.08 : 0.16;

  // ── RESICO PF ─────────────────────────────────────────────
  if (ingresos > LIMITE_RESICO_PF) {
    advertencias.push(
      `Ingresos superan $3.5M MXN — RESICO PF no es elegible. Solo Honorarios o Régimen General son opciones.`,
    );
  } else {
    const isrResico = isrResicoAnual(ingresos);
    const ivaResico = Math.max(0, (ingresos - gastos) * ivaRate);
    rows.push({
      regimen: "resico_pf",
      display_name: DISPLAY_NAME.resico_pf,
      isr_anual: round2(isrResico),
      iva_neto_estimado: round2(ivaResico),
      base_gravable: round2(ingresos), // RESICO grava ingresos brutos
      carga_fiscal_total: round2(isrResico + ivaResico),
      porcentaje_efectivo: round4((isrResico + ivaResico) / ingresos),
      notas: [
        "RESICO grava ingresos brutos (no permite deducir gastos en provisionales).",
        "Las deducciones personales aplican solo en la declaración anual (Art. 151 LISR).",
        ingresos > LIMITE_RESICO_PF * 0.9
          ? "⚠️ A 90% del límite anual — riesgo de salir forzosamente."
          : "",
      ].filter(Boolean),
    });
  }

  // ── HONORARIOS (Actividad Profesional) ───────────────────────
  const baseHonorarios = Math.max(0, ingresos - gastos);
  const isrHonorarios = isrHonorariosAnual(baseHonorarios);
  const retencionClientes = input.retencion_clientes_pm ?? 0;
  const ivaHonorarios = Math.max(0, (ingresos - gastos) * ivaRate);
  rows.push({
    regimen: "honorarios",
    display_name: DISPLAY_NAME.honorarios,
    isr_anual: round2(Math.max(0, isrHonorarios - retencionClientes)),
    iva_neto_estimado: round2(ivaHonorarios),
    base_gravable: round2(baseHonorarios),
    carga_fiscal_total: round2(Math.max(0, isrHonorarios - retencionClientes) + ivaHonorarios),
    porcentaje_efectivo: round4(
      (Math.max(0, isrHonorarios - retencionClientes) + ivaHonorarios) / ingresos,
    ),
    notas: [
      "Permite deducir gastos estrictamente indispensables con CFDI (Art. 103 LISR).",
      "Tarifa progresiva 1.92% – 35% (Art. 96 LISR).",
      retencionClientes > 0
        ? `Retención 1.25% por clientes PM acreditable: ${formatMxn(retencionClientes)}`
        : "Si tus clientes son PM, te retendrán 1.25% de ISR (Art. 106 LISR).",
    ],
  });

  // ── RÉGIMEN GENERAL PM ───────────────────────────────────────
  // Solo aplica si el contribuyente cambia a PM (constituye una empresa).
  // ISR PM = 30% sobre utilidad fiscal.
  const utilidadPm = Math.max(0, ingresos - gastos);
  const isrPm = utilidadPm * 0.30;
  const ivaPm = Math.max(0, (ingresos - gastos) * ivaRate);
  const numEmpleados = input.num_empleados ?? 0;
  const ptuPm = utilidadPm * 0.10; // PTU obligatoria si hay empleados
  rows.push({
    regimen: "general_pm",
    display_name: DISPLAY_NAME.general_pm,
    isr_anual: round2(isrPm),
    iva_neto_estimado: round2(ivaPm),
    base_gravable: round2(utilidadPm),
    carga_fiscal_total: round2(isrPm + ivaPm + (numEmpleados > 0 ? ptuPm : 0)),
    porcentaje_efectivo: round4(
      (isrPm + ivaPm + (numEmpleados > 0 ? ptuPm : 0)) / ingresos,
    ),
    notas: [
      "Tasa fija 30% sobre utilidad fiscal (Art. 9 LISR).",
      "Requiere constituir Persona Moral (notario, RFC nuevo, contabilidad electrónica completa).",
      numEmpleados > 0
        ? `PTU 10% (${numEmpleados} empleados): ${formatMxn(ptuPm)} estimado.`
        : "Sin empleados, sin PTU.",
      ingresos > LIMITE_RESICO_PM
        ? "Ingresos superan $35M — el RESICO PM tampoco aplica, solo Régimen General PM."
        : "Si la PM tiene ingresos < $35M, evaluar también RESICO PM (tasa 30% pero con beneficios de flujo).",
    ],
  });

  // Permanencia mínima RESICO
  const mesesEnResico = input.meses_en_resico ?? 0;
  if (mesesEnResico > 0 && mesesEnResico < 24) {
    advertencias.push(
      `Permanencia mínima en RESICO no cumplida (${mesesEnResico}/24 meses). Cambio voluntario podría requerir trámite específico ante el SAT.`,
    );
  }

  // Cambio PF → PM
  advertencias.push(
    "Cambio PF → PM implica: constituir sociedad ante notario (~$15-25k), nuevo RFC, contabilidad electrónica completa, contador obligatorio, y NO se trasladan saldos a favor ni pérdidas de la PF a la PM.",
  );

  // Recomendación: el de menor carga total
  const sorted = [...rows].sort((a, b) => a.carga_fiscal_total - b.carga_fiscal_total);
  const ganador = sorted[0];
  const segundo = sorted[1];
  const ahorro = segundo
    ? round2(segundo.carga_fiscal_total - ganador.carga_fiscal_total)
    : 0;

  let razonamiento = `${ganador.display_name} tiene la menor carga fiscal total (${formatMxn(
    ganador.carga_fiscal_total,
  )} vs ${formatMxn(segundo?.carga_fiscal_total ?? 0)} del siguiente).`;

  if (ganador.regimen === "resico_pf" && ingresos > LIMITE_RESICO_PF * 0.85) {
    razonamiento +=
      " ⚠️ Estás cerca del límite RESICO ($3.5M). Considera Honorarios para evitar salida forzosa a media-año.";
  }
  if (gastos > ingresos * 0.5 && ganador.regimen === "resico_pf") {
    razonamiento +=
      " ⚠️ Tienes gastos altos (>50% de ingresos) — Honorarios podría compensar la diferencia con la deducción.";
  }

  return {
    ok: true,
    inputs: input,
    rows,
    recomendacion: {
      regimen: ganador.regimen,
      razonamiento,
      ahorro_anual_vs_segundo: ahorro,
    },
    advertencias,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function formatMxn(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-MX");
}
