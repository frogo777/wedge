/**
 * Motor de cálculo — Arrendamiento (Cap. III LISR, Arts. 114-118).
 *
 * Para personas físicas que rentan inmuebles. Dos opciones de deducción:
 *
 *   A) Deducción ciega (35%):
 *      - Base gravable = ingresos × 65%
 *      - Sin comprobantes, simple
 *
 *   B) Deducciones reales:
 *      - Base gravable = ingresos − gastos comprobados
 *      - Requiere CFDIs de gastos del inmueble
 *      - Gastos típicos: predial, mantenimiento, intereses hipoteca,
 *        seguros, sueldos administrador, honorarios notario/gestor
 *
 * IVA:
 *   - Casa habitación: EXENTO (Art. 9 fracc. II LIVA)
 *   - Local comercial: 16% (8% frontera norte)
 *   - Temporal habitacional (Airbnb < 6 meses): se trata como hospedaje turístico, 16%
 *
 * Valor diferenciador de wedge: recomienda automáticamente la opción
 * que paga menos ISR cada mes, simulando ambas en paralelo.
 *
 * Citas legales:
 *   - Art. 114 LISR — sujetos del régimen
 *   - Art. 115 LISR — deducciones autorizadas
 *   - Art. 116 LISR — pagos provisionales mensuales
 *   - Art. 9 fracc. II LIVA — exención casa habitación
 */

import type {
  RegimeEngine,
  RegimeResult,
  RegimeOptions,
  Transaction,
  BreakdownStep,
} from "../regime-types";
import { resicoISRRate } from "../resico"; // reuso de tabla mensual (similar para arrendamiento art. 116)

/* ─── Constantes ────────────────────────────────────────────────────── */

export const ARRENDAMIENTO_DEDUCCION_CIEGA = 0.35; // 35% del ingreso bruto

/** Tipo de uso del inmueble — determina si aplica IVA. */
export type ArrendamientoUso = "HABITACIONAL" | "COMERCIAL" | "TEMPORAL_TURISTICO";

export type ArrendamientoOpcion = "DEDUCCION_CIEGA" | "DEDUCCIONES_REALES";

/* ─── Helpers ──────────────────────────────────────────────────────── */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function periodMatches(date: string, period: string): boolean {
  return typeof date === "string" && date.slice(0, 7) === period;
}

function sumGastosDeducibles(txs: Transaction[]): number {
  return txs
    .filter((t) => t.type === "out")
    .filter((t) => {
      // Solo gastos con CFDI vigente son deducibles
      const status = (t.cfdi_status || "").toLowerCase().trim();
      return status === "vigente" || status === "timbrado";
    })
    .reduce((acc, t) => acc + (typeof t.amount === "number" ? t.amount : 0), 0);
}

/* ─── Opciones extendidas ──────────────────────────────────────────── */

export interface ArrendamientoOptions extends RegimeOptions {
  /** Uso del inmueble. Default: HABITACIONAL (más común, exento IVA). */
  uso?: ArrendamientoUso;
  /** Forzar una opción específica. Default: wedge recomienda la mejor. */
  opcionForzada?: ArrendamientoOpcion;
}

/* ─── Engine ───────────────────────────────────────────────────────── */

export const arrendamientoEngine: RegimeEngine = {
  key: "arrendamiento",
  name: "Arrendamiento",

  calculate(
    transactions,
    period,
    opts?: RegimeOptions,
  ): RegimeResult {
    const arrOpts = (opts ?? {}) as ArrendamientoOptions;
    const uso: ArrendamientoUso = arrOpts.uso ?? "HABITACIONAL";
    const fronteraNorte = arrOpts.fronteraNorte ?? false;

    const txs = transactions.filter((t) => periodMatches(t.date, period));
    const ingresos = txs
      .filter((t) => t.type === "in")
      .reduce((acc, t) => acc + (typeof t.amount === "number" ? t.amount : 0), 0);

    if (ingresos === 0) {
      return {
        regime: "arrendamiento",
        period,
        ingresos_brutos: 0,
        deducciones_aplicadas: 0,
        base_gravable: 0,
        isr_calculado: 0,
        isr_retenido: 0,
        isr_a_pagar: 0,
        iva_trasladado: 0,
        iva_acreditable: 0,
        iva_retenido: 0,
        iva_a_pagar: 0,
        total_a_pagar: 0,
        steps: [{
          label: "Sin renta cobrada en este periodo",
          value: 0,
          tone: "neutral",
        }],
        citas_legales: ["Art. 114 LISR"],
        warnings: ["No registramos pagos de renta este mes. Si tu inquilino te paga después, agregaremos los ingresos al periodo correcto."],
      };
    }

    const gastosReales = sumGastosDeducibles(txs);

    // Simular ambas opciones
    const baseCiega = ingresos * (1 - ARRENDAMIENTO_DEDUCCION_CIEGA);
    const baseReal = Math.max(0, ingresos - gastosReales);

    // Recomendación: la que paga menos ISR
    const opcionElegida: ArrendamientoOpcion =
      arrOpts.opcionForzada ??
      (baseReal < baseCiega ? "DEDUCCIONES_REALES" : "DEDUCCION_CIEGA");

    const deducciones_aplicadas =
      opcionElegida === "DEDUCCION_CIEGA"
        ? ingresos * ARRENDAMIENTO_DEDUCCION_CIEGA
        : gastosReales;

    const base_gravable =
      opcionElegida === "DEDUCCION_CIEGA" ? baseCiega : baseReal;

    // ISR: usar tabla Art. 96/116 LISR — para v1 usamos resicoISRRate
    // como aproximación. v2 deberá usar tarifa progresiva real.
    // TODO Sprint Expansion-3.5: implementar tarifaArt116() exacta.
    const tasaAprox = resicoISRRate(base_gravable);
    const isr_calculado = base_gravable * tasaAprox;
    const isr_a_pagar = round2(isr_calculado); // Sin retenciones por defecto en arrendamiento

    // IVA según uso del inmueble
    const ivaApplies = uso === "COMERCIAL" || uso === "TEMPORAL_TURISTICO";
    const ivaTasa = fronteraNorte ? 0.08 : 0.16;
    const iva_trasladado = ivaApplies ? ingresos * ivaTasa : 0;

    const iva_acreditable = txs
      .filter((t) => t.type === "out")
      .reduce((acc, t) => acc + (typeof t.iva_acreditable === "number" ? t.iva_acreditable : 0), 0);

    const iva_a_pagar = Math.max(0, round2(iva_trasladado - iva_acreditable));

    /* ─── Steps consolidados ──────────────────────────────────────── */
    const steps: BreakdownStep[] = [];
    steps.push({
      label: "Renta cobrada",
      value: round2(ingresos),
      tone: "neutral",
    });

    // Mostrar comparativa ambas opciones (transparencia)
    steps.push({
      label: "Opción A: Deducción ciega (35% sin papeles)",
      value: round2(baseCiega * tasaAprox),
      formula: `${round2(ingresos)} × 65% × tasa = ${round2(baseCiega * tasaAprox)}`,
      tone: opcionElegida === "DEDUCCION_CIEGA" ? "positive" : "neutral",
      citaLegal: "Art. 115 LISR",
    });
    steps.push({
      label: "Opción B: Gastos reales comprobados",
      value: round2(baseReal * tasaAprox),
      formula: gastosReales > 0
        ? `${round2(ingresos)} − ${round2(gastosReales)} × tasa = ${round2(baseReal * tasaAprox)}`
        : "Sin gastos comprobados este mes",
      tone: opcionElegida === "DEDUCCIONES_REALES" ? "positive" : "neutral",
      citaLegal: "Art. 115 LISR",
    });

    steps.push({
      label: `wedge eligió ${opcionElegida === "DEDUCCION_CIEGA" ? "deducción ciega" : "gastos reales"} porque te conviene más`,
      value: round2(isr_calculado),
      tone: "positive",
    });

    if (iva_trasladado > 0) {
      steps.push({
        label: `IVA por ${uso === "COMERCIAL" ? "local comercial" : "renta turística"} (${fronteraNorte ? "8%" : "16%"})`,
        value: round2(iva_trasladado),
        tone: "neutral",
        citaLegal: "Art. 1 LIVA",
      });
    } else {
      steps.push({
        label: "Sin IVA — renta de casa habitación está exenta",
        value: 0,
        tone: "positive",
        citaLegal: "Art. 9 fracc. II LIVA",
      });
    }

    return {
      regime: "arrendamiento",
      period,
      ingresos_brutos: round2(ingresos),
      deducciones_aplicadas: round2(deducciones_aplicadas),
      base_gravable: round2(base_gravable),
      isr_calculado: round2(isr_calculado),
      isr_retenido: 0,
      isr_a_pagar,
      iva_trasladado: round2(iva_trasladado),
      iva_acreditable: round2(iva_acreditable),
      iva_retenido: 0,
      iva_a_pagar,
      total_a_pagar: round2(isr_a_pagar + iva_a_pagar),
      steps,
      citas_legales: [
        "Art. 114 LISR",
        "Art. 115 LISR",
        "Art. 116 LISR",
        ...(ivaApplies ? ["Art. 1 LIVA"] : ["Art. 9 fracc. II LIVA"]),
      ],
    };
  },
};

/** Helper para que UI pueda mostrar la comparativa antes de calcular final. */
export function compararOpciones(
  ingresos: number,
  gastos: number,
): {
  ciega: { base: number; ahorro_vs_real: number };
  real: { base: number; ahorro_vs_ciega: number };
  recomendada: ArrendamientoOpcion;
} {
  const baseCiega = ingresos * (1 - ARRENDAMIENTO_DEDUCCION_CIEGA);
  const baseReal = Math.max(0, ingresos - gastos);
  return {
    ciega: { base: round2(baseCiega), ahorro_vs_real: round2(baseReal - baseCiega) },
    real: { base: round2(baseReal), ahorro_vs_ciega: round2(baseCiega - baseReal) },
    recomendada: baseReal < baseCiega ? "DEDUCCIONES_REALES" : "DEDUCCION_CIEGA",
  };
}
