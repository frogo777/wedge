/**
 * Motor de cálculo — Declaración Anual PF (Arts. 150-152 LISR).
 *
 * Consolida ingresos de TODOS los regímenes del usuario en el año
 * fiscal + aplica deducciones personales (Art. 151) + compara contra
 * pagos provisionales para determinar saldo a favor o a pagar.
 *
 * Diferenciador wedge: detección automática de deducciones desde CFDIs
 * recibidos (médicos, hospitales, seguros, escuelas, intereses hipoteca).
 * Ningún competidor MX lo hace automático.
 *
 * Citas legales:
 *   - Art. 150 LISR — declaración anual obligatoria
 *   - Art. 151 LISR — deducciones personales
 *   - Art. 152 LISR — tarifa anual ISR
 *   - Art. 27 fracc. III LISR — requisito medio bancarizado
 */

import type {
  RegimeKey,
  BreakdownStep,
  Transaction,
} from "../regime-types";
import { UMA_ANUAL_2026 } from "../calculators/constants";

/* ─── Constantes ────────────────────────────────────────────────────── */

/** UMA 2026 valor anual. Fuente ÚNICA de verdad: `calculators/constants.ts`
 *  (DOF 09-ene-2026 → $42,794.64 = mensual $3,566.22 × 12).
 *  Se re-exporta como alias para no duplicar el valor: antes este archivo
 *  hardcodeaba $40,257.18, divergente del canónico, subvaluando los topes
 *  de deducciones personales (Art. 151) y AFORE (auditoría P0). */
export const UMA_2026_ANUAL = UMA_ANUAL_2026;

/** Tope global deducciones personales: menor entre 5 UMAs o 15% del ingreso. */
export const DEDUCCIONES_PERSONALES_TOPE_UMAS = 5;
export const DEDUCCIONES_PERSONALES_TOPE_PORCENTAJE = 0.15;

/** Donativos máximo: 7% del ingreso del año previo (Art. 151 fracc. III). */
export const DONATIVOS_MAX_PORCENTAJE = 0.07;

/** AFORE aportaciones voluntarias máximo: 10% del ingreso o 5 UMAs. */
export const AFORE_MAX_PORCENTAJE = 0.10;
export const AFORE_MAX_UMAS = 5;

/* ─── Tipos ────────────────────────────────────────────────────────── */

export interface IngresoAnual {
  regimen: RegimeKey;
  total_ingresos: number;
  pagos_provisionales: number; // ISR ya pagado durante el año
  retenciones_terceros: number; // plataformas, patrón, etc
}

export interface DeduccionesPersonalesDeclaradas {
  gastos_medicos?: number;      // sin tope, medio bancarizado
  gastos_dentales?: number;     // sin tope
  gastos_optometria?: number;   // sin tope
  primas_seguro_gastos_medicos?: number;
  colegiaturas?: number;
  intereses_hipoteca?: number;
  donativos?: number;
  aportaciones_afore?: number;
  gastos_funerarios?: number;
  transporte_escolar?: number;
}

export interface AnualResult {
  fiscal_year: number;
  total_ingresos_brutos: number;
  total_pagos_provisionales: number;
  total_retenciones: number;
  deducciones_personales_aplicadas: number;
  deducciones_personales_topadas_a: number;
  base_gravable: number;
  isr_anual_calculado: number;
  isr_pagado_durante_anio: number;
  /** diferencia > 0: el user debe pagar al SAT.
   *  diferencia < 0: el SAT debe devolver al user (saldo a favor).
   */
  diferencia: number;
  saldo_a_favor: number; // |diferencia| si diferencia < 0, sino 0
  saldo_a_pagar: number; // diferencia si > 0, sino 0
  tasa_efectiva: number; // ISR / ingresos brutos
  steps: BreakdownStep[];
  citas_legales: string[];
  deducciones_detectadas?: DeduccionDetectada[];
}

export interface DeduccionDetectada {
  tipo: string;
  monto: number;
  origen: string; // descripción/emisor del CFDI
  cfdi_id?: string;
}

/* ─── Tarifa anual Art. 152 LISR (2026) ────────────────────────────── */

interface TarifaTramo {
  limite_inferior: number;
  limite_superior: number;
  cuota_fija: number;
  porcentaje: number;
}

const TARIFA_ART_152_LISR_2026: TarifaTramo[] = [
  { limite_inferior: 0.01,        limite_superior: 8_952.49,    cuota_fija: 0,           porcentaje: 0.0192 },
  { limite_inferior: 8_952.50,    limite_superior: 75_984.55,   cuota_fija: 171.88,      porcentaje: 0.0640 },
  { limite_inferior: 75_984.56,   limite_superior: 133_536.07,  cuota_fija: 4_461.94,    porcentaje: 0.1088 },
  { limite_inferior: 133_536.08,  limite_superior: 155_229.80,  cuota_fija: 10_723.55,   porcentaje: 0.16 },
  { limite_inferior: 155_229.81,  limite_superior: 185_852.57,  cuota_fija: 14_194.54,   porcentaje: 0.1792 },
  { limite_inferior: 185_852.58,  limite_superior: 374_837.88,  cuota_fija: 19_682.13,   porcentaje: 0.2136 },
  { limite_inferior: 374_837.89,  limite_superior: 590_795.99,  cuota_fija: 60_049.40,   porcentaje: 0.2352 },
  { limite_inferior: 590_796.00,  limite_superior: 1_127_926.84, cuota_fija: 110_842.74, porcentaje: 0.30 },
  { limite_inferior: 1_127_926.85, limite_superior: 1_503_902.46, cuota_fija: 271_981.99, porcentaje: 0.32 },
  { limite_inferior: 1_503_902.47, limite_superior: 4_511_707.37, cuota_fija: 392_294.17, porcentaje: 0.34 },
  { limite_inferior: 4_511_707.38, limite_superior: Infinity,     cuota_fija: 1_414_947.85, porcentaje: 0.35 },
];

export function calcularISRTarifaAnual(baseGravable: number): number {
  if (baseGravable <= 0) return 0;
  const tramo = TARIFA_ART_152_LISR_2026.find(
    (t) => baseGravable >= t.limite_inferior && baseGravable <= t.limite_superior,
  );
  if (!tramo) return 0;
  const excedente = baseGravable - tramo.limite_inferior;
  return tramo.cuota_fija + excedente * tramo.porcentaje;
}

/* ─── Detección automática de deducciones desde CFDIs ──────────────── */

const KEYWORDS_MEDICOS = [
  "hospital", "clinica", "clínica", "medico", "médico", "doctor",
  "consulta", "laboratorio", "estudios", "rx", "rayos x",
];

const KEYWORDS_DENTALES = [
  "dentista", "ortodoncia", "endodoncia", "implante dental",
];

const KEYWORDS_OPTOMETRIA = [
  "optica", "óptica", "lentes graduados", "examen visual",
];

const KEYWORDS_SEGUROS = [
  "seguro gastos medicos", "seguro gastos médicos", "póliza médica",
  "axa", "metlife", "gnp", "inbursa",
];

const KEYWORDS_COLEGIATURAS = [
  "colegiatura", "inscripción escolar", "anualidad escolar",
];

const KEYWORDS_HIPOTECA = [
  "intereses hipotecarios", "constancia hipoteca", "infonavit",
  "fovissste",
];

const KEYWORDS_DONATIVOS = [
  "donativo", "donataria autorizada",
];

const KEYWORDS_AFORE = [
  "aportaciones voluntarias afore", "ahorro voluntario",
];

function categorizarCfdi(descripcion: string): {
  tipo: keyof DeduccionesPersonalesDeclaradas;
} | null {
  const desc = descripcion.toLowerCase();
  if (KEYWORDS_MEDICOS.some((k) => desc.includes(k))) return { tipo: "gastos_medicos" };
  if (KEYWORDS_DENTALES.some((k) => desc.includes(k))) return { tipo: "gastos_dentales" };
  if (KEYWORDS_OPTOMETRIA.some((k) => desc.includes(k))) return { tipo: "gastos_optometria" };
  if (KEYWORDS_SEGUROS.some((k) => desc.includes(k))) return { tipo: "primas_seguro_gastos_medicos" };
  if (KEYWORDS_COLEGIATURAS.some((k) => desc.includes(k))) return { tipo: "colegiaturas" };
  if (KEYWORDS_HIPOTECA.some((k) => desc.includes(k))) return { tipo: "intereses_hipoteca" };
  if (KEYWORDS_DONATIVOS.some((k) => desc.includes(k))) return { tipo: "donativos" };
  if (KEYWORDS_AFORE.some((k) => desc.includes(k))) return { tipo: "aportaciones_afore" };
  return null;
}

/**
 * Escanea CFDIs recibidos del año y detecta deducciones personales
 * automáticamente. Solo cuenta CFDIs vigentes con pago bancarizado.
 */
export function detectarDeduccionesPersonales(
  cfdis: Transaction[],
): DeduccionDetectada[] {
  const detectadas: DeduccionDetectada[] = [];
  for (const cfdi of cfdis) {
    if (cfdi.type !== "out") continue;
    const status = (cfdi.cfdi_status || "").toLowerCase().trim();
    if (status !== "vigente" && status !== "timbrado") continue;
    // Art. 27 fracc. III: medio bancarizado obligatorio si > $2K
    if (cfdi.amount > 2000) {
      const forma = (cfdi.forma_pago || "").trim();
      const bancarizadas = new Set(["02", "03", "04", "05", "28", "29"]);
      if (forma && !bancarizadas.has(forma)) continue; // efectivo > $2K = no deducible
    }
    const categoria = categorizarCfdi(cfdi.description || "");
    if (!categoria) continue;
    detectadas.push({
      tipo: categoria.tipo,
      monto: cfdi.amount,
      origen: cfdi.description || "",
      cfdi_id: cfdi.id,
    });
  }
  return detectadas;
}

/* ─── Engine principal ─────────────────────────────────────────────── */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcularAnual(input: {
  fiscalYear: number;
  ingresos: IngresoAnual[];
  deduccionesPersonalesDeclaradas: DeduccionesPersonalesDeclaradas;
  cfdisAnio?: Transaction[]; // opcional — si se pasa, detecta auto
}): AnualResult {
  const total_ingresos_brutos = input.ingresos.reduce((acc, i) => acc + i.total_ingresos, 0);
  const total_pagos_provisionales = input.ingresos.reduce((acc, i) => acc + i.pagos_provisionales, 0);
  const total_retenciones = input.ingresos.reduce((acc, i) => acc + i.retenciones_terceros, 0);

  // Sumar deducciones personales declaradas + detectadas automáticamente
  const auto = input.cfdisAnio ? detectarDeduccionesPersonales(input.cfdisAnio) : [];
  const autoTotalPorTipo: Partial<Record<keyof DeduccionesPersonalesDeclaradas, number>> = {};
  for (const d of auto) {
    const key = d.tipo as keyof DeduccionesPersonalesDeclaradas;
    autoTotalPorTipo[key] = (autoTotalPorTipo[key] ?? 0) + d.monto;
  }

  const declared = input.deduccionesPersonalesDeclaradas;
  const merged: Record<string, number> = {
    gastos_medicos: (declared.gastos_medicos ?? 0) + (autoTotalPorTipo.gastos_medicos ?? 0),
    gastos_dentales: (declared.gastos_dentales ?? 0) + (autoTotalPorTipo.gastos_dentales ?? 0),
    gastos_optometria: (declared.gastos_optometria ?? 0) + (autoTotalPorTipo.gastos_optometria ?? 0),
    primas_seguro_gastos_medicos: (declared.primas_seguro_gastos_medicos ?? 0) + (autoTotalPorTipo.primas_seguro_gastos_medicos ?? 0),
    colegiaturas: (declared.colegiaturas ?? 0) + (autoTotalPorTipo.colegiaturas ?? 0),
    intereses_hipoteca: (declared.intereses_hipoteca ?? 0) + (autoTotalPorTipo.intereses_hipoteca ?? 0),
    donativos: (declared.donativos ?? 0) + (autoTotalPorTipo.donativos ?? 0),
    aportaciones_afore: (declared.aportaciones_afore ?? 0) + (autoTotalPorTipo.aportaciones_afore ?? 0),
    gastos_funerarios: declared.gastos_funerarios ?? 0,
    transporte_escolar: declared.transporte_escolar ?? 0,
  };

  // Aplicar topes específicos
  const donativos_max = total_ingresos_brutos * DONATIVOS_MAX_PORCENTAJE;
  if (merged.donativos > donativos_max) merged.donativos = donativos_max;

  const afore_max = Math.min(total_ingresos_brutos * AFORE_MAX_PORCENTAJE, AFORE_MAX_UMAS * UMA_2026_ANUAL);
  if (merged.aportaciones_afore > afore_max) merged.aportaciones_afore = afore_max;

  // Funerarios: 1 UMA anual máximo
  if (merged.gastos_funerarios > UMA_2026_ANUAL) merged.gastos_funerarios = UMA_2026_ANUAL;

  const deducciones_subtotal = Object.values(merged).reduce((acc, v) => acc + v, 0);

  // Tope global: menor entre 5 UMAs o 15% del ingreso
  const tope_global = Math.min(
    DEDUCCIONES_PERSONALES_TOPE_UMAS * UMA_2026_ANUAL,
    total_ingresos_brutos * DEDUCCIONES_PERSONALES_TOPE_PORCENTAJE,
  );
  const deducciones_personales_aplicadas = Math.min(deducciones_subtotal, tope_global);
  const deducciones_personales_topadas_a = deducciones_subtotal > tope_global ? tope_global : deducciones_subtotal;

  const base_gravable = Math.max(0, total_ingresos_brutos - deducciones_personales_aplicadas);
  const isr_anual_calculado = calcularISRTarifaAnual(base_gravable);

  const isr_pagado_durante_anio = total_pagos_provisionales + total_retenciones;
  const diferencia = round2(isr_anual_calculado - isr_pagado_durante_anio);
  const saldo_a_favor = diferencia < 0 ? Math.abs(diferencia) : 0;
  const saldo_a_pagar = diferencia > 0 ? diferencia : 0;
  const tasa_efectiva = total_ingresos_brutos > 0 ? isr_anual_calculado / total_ingresos_brutos : 0;

  const steps: BreakdownStep[] = [];
  steps.push({
    label: `Ingresos totales del año ${input.fiscalYear}`,
    value: round2(total_ingresos_brutos),
    tone: "neutral",
    citaLegal: "Art. 150 LISR",
  });
  steps.push({
    label: "Deducciones personales aplicadas",
    value: -round2(deducciones_personales_aplicadas),
    formula: deducciones_subtotal > tope_global
      ? `Topado al máximo legal (${round2(tope_global)})`
      : `Suma de gastos detectados + declarados`,
    tone: "positive",
    citaLegal: "Art. 151 LISR",
  });
  steps.push({
    label: "Base gravable",
    value: round2(base_gravable),
    tone: "neutral",
  });
  steps.push({
    label: "ISR anual calculado",
    value: round2(isr_anual_calculado),
    formula: "Tarifa Art. 152 LISR aplicada",
    tone: "neutral",
    citaLegal: "Art. 152 LISR",
  });
  steps.push({
    label: "ISR pagado durante el año (pagos provisionales + retenciones)",
    value: -round2(isr_pagado_durante_anio),
    tone: "positive",
  });

  if (saldo_a_favor > 0) {
    steps.push({
      label: "💰 Saldo a favor — el SAT te debe devolver",
      value: round2(saldo_a_favor),
      tone: "positive",
    });
  } else if (saldo_a_pagar > 0) {
    steps.push({
      label: "ISR adicional a pagar en la declaración anual",
      value: round2(saldo_a_pagar),
      tone: "warning",
    });
  } else {
    steps.push({
      label: "Cuentas claras — no debes ni te deben",
      value: 0,
      tone: "positive",
    });
  }

  return {
    fiscal_year: input.fiscalYear,
    total_ingresos_brutos: round2(total_ingresos_brutos),
    total_pagos_provisionales: round2(total_pagos_provisionales),
    total_retenciones: round2(total_retenciones),
    deducciones_personales_aplicadas: round2(deducciones_personales_aplicadas),
    deducciones_personales_topadas_a: round2(deducciones_personales_topadas_a),
    base_gravable: round2(base_gravable),
    isr_anual_calculado: round2(isr_anual_calculado),
    isr_pagado_durante_anio: round2(isr_pagado_durante_anio),
    diferencia,
    saldo_a_favor: round2(saldo_a_favor),
    saldo_a_pagar: round2(saldo_a_pagar),
    tasa_efectiva: round2(tasa_efectiva * 1000) / 1000, // 3 decimales
    steps,
    citas_legales: ["Art. 150 LISR", "Art. 151 LISR", "Art. 152 LISR", "Art. 27 fracc. III LISR"],
    deducciones_detectadas: auto.length > 0 ? auto : undefined,
  };
}
