/**
 * Motor de cálculo — Plataformas Digitales (Art. 113-A a 113-C LISR).
 *
 * Aplica a contribuyentes PF que reciben ingresos por:
 *   - Transporte (Uber, DiDi, Cabify) — 2.5% ISR
 *   - Entrega (Rappi, UberEats) — 2.1% ISR
 *   - Hospedaje (Airbnb, Booking) — 4.0% ISR
 *   - Marketplace (MercadoLibre, Amazon) — 4.0% ISR
 *
 * Plataforma actúa como retenedor: descuenta tasa y entera al SAT.
 * Si total anual < $300K, el contribuyente puede optar por que esa
 * retención sea pago definitivo (Art. 113-B LISR) — sin declaración mensual.
 *
 * Si total anual > $300K o el contribuyente NO opta por definitivo:
 * declaración mensual = ISR teórico − retenciones ya hechas.
 *
 * Diseño:
 *   - Side-effect free (no DB, no I/O)
 *   - Cash basis estricto (Art. 113-A es cobrado, no devengado)
 *   - El emisor_rfc del CFDI determina la plataforma; sin RFC válido el
 *     ingreso NO se clasifica como plataforma
 *
 * Citas legales clave:
 *   - Art. 113-A LISR — tasas ISR por tipo de plataforma
 *   - Art. 113-B LISR — opción pago definitivo
 *   - Art. 113-C LISR — obligaciones de la plataforma
 *   - Art. 1-A fracc. II LIVA — IVA retenido 8% por plataforma
 */

import type {
  RegimeEngine,
  RegimeResult,
  RegimeOptions,
  Transaction,
  BreakdownStep,
} from "../regime-types";
import { RFC_PLATAFORMAS } from "../cfdi-classifier";

/* ─── Constantes ────────────────────────────────────────────────────── */

/** Umbral anual para opción pago definitivo (Art. 113-B LISR). */
export const PLATAFORMAS_OPCION_DEFINITIVA_LIMITE_ANUAL = 300_000;

/* ─── Helpers ──────────────────────────────────────────────────────── */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sum(nums: Array<number | null | undefined>): number {
  return nums.reduce((acc: number, n) => acc + (typeof n === "number" && Number.isFinite(n) ? n : 0), 0);
}

function periodMatches(date: string, period: string): boolean {
  return typeof date === "string" && date.slice(0, 7) === period;
}

/* ─── Engine ───────────────────────────────────────────────────────── */

interface PlataformaAgrupada {
  nombre: string;
  tipo: string;
  ingresos: number;
  isr_retenido: number;
  iva_retenido: number;
  transactions: number;
}

function agruparPorPlataforma(txs: Transaction[]): Map<string, PlataformaAgrupada> {
  const map = new Map<string, PlataformaAgrupada>();
  for (const tx of txs) {
    if (tx.type !== "in") continue;
    const rfc = (tx.emisor_rfc || "").toUpperCase().trim();
    if (!rfc) continue;
    const plat = RFC_PLATAFORMAS[rfc];
    if (!plat) continue;
    const cur = map.get(plat.nombre) || {
      nombre: plat.nombre,
      tipo: plat.tipo,
      ingresos: 0,
      isr_retenido: 0,
      iva_retenido: 0,
      transactions: 0,
    };
    cur.ingresos += tx.amount;
    cur.isr_retenido += typeof tx.isr_retenido === "number" ? tx.isr_retenido : 0;
    cur.iva_retenido += typeof tx.iva_retenido === "number" ? tx.iva_retenido : 0;
    cur.transactions += 1;
    map.set(plat.nombre, cur);
  }
  return map;
}

function calcularISRTeoricoPorTipo(ingresos: number, tipo: string): number {
  switch (tipo) {
    case "TRANSPORTE": return ingresos * 0.025;
    case "ENTREGA":    return ingresos * 0.021;
    case "HOSPEDAJE":  return ingresos * 0.04;
    case "MARKETPLACE": return ingresos * 0.04;
    default:           return 0;
  }
}

function calcularIVATrasladado(ingresos: number, fronteraNorte: boolean): number {
  // Plataformas digitales: IVA trasladado al cliente es del lado de la plataforma,
  // no del contribuyente. Para Hospedaje (Airbnb host MX) el IVA SÍ es del host.
  // Simplificación v1: asumimos 16% sobre ingresos (8% frontera).
  return ingresos * (fronteraNorte ? 0.08 : 0.16);
}

export const plataformasEngine: RegimeEngine = {
  key: "plataformas",
  name: "Plataformas Digitales",

  calculate(transactions, period, opts) {
    const fronteraNorte = opts?.fronteraNorte ?? false;
    const txs = transactions.filter((t) => periodMatches(t.date, period));
    const grouped = agruparPorPlataforma(txs);

    let ingresos_brutos = 0;
    let isr_calculado = 0;
    let isr_retenido = 0;
    let iva_retenido = 0;
    const steps: BreakdownStep[] = [];
    const warnings: string[] = [];
    const platformList: PlataformaAgrupada[] = [];

    for (const plat of grouped.values()) {
      platformList.push(plat);
      ingresos_brutos += plat.ingresos;
      isr_calculado += calcularISRTeoricoPorTipo(plat.ingresos, plat.tipo);
      isr_retenido += plat.isr_retenido;
      iva_retenido += plat.iva_retenido;

      steps.push({
        label: `${plat.nombre} (${plat.transactions} ${plat.transactions === 1 ? "transacción" : "transacciones"})`,
        value: round2(plat.ingresos),
        tone: "neutral",
      });
      if (plat.isr_retenido > 0) {
        steps.push({
          label: `  Lo que ${plat.nombre} ya le pagó al SAT por ti`,
          value: -round2(plat.isr_retenido),
          tone: "positive",
          citaLegal: "Art. 113-A LISR",
        });
      }
    }

    if (platformList.length === 0) {
      return {
        regime: "plataformas",
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
          label: "Sin ingresos de plataformas en este periodo",
          value: 0,
          tone: "neutral",
        }],
        citas_legales: [],
        warnings: ["No detectamos facturas de plataformas (Uber, DiDi, Rappi, Airbnb, etc) este mes."],
      };
    }

    const iva_trasladado = calcularIVATrasladado(ingresos_brutos, fronteraNorte);
    const iva_acreditable = round2(sum(txs.filter((t) => t.type === "out").map((t) => t.iva_acreditable)));
    const isr_a_pagar = Math.max(0, round2(isr_calculado - isr_retenido));
    const iva_a_pagar = Math.max(0, round2(iva_trasladado - iva_acreditable - iva_retenido));
    const total_a_pagar = round2(isr_a_pagar + iva_a_pagar);

    /* ─── Steps consolidados ──────────────────────────────────────── */
    steps.push({
      label: "Total cobrado de plataformas",
      value: round2(ingresos_brutos),
      tone: "neutral",
    });
    steps.push({
      label: "ISR que te corresponde según tasas Art. 113-A",
      value: round2(isr_calculado),
      formula: "(suma de cada plataforma × su tasa)",
      tone: "neutral",
      citaLegal: "Art. 113-A LISR",
    });
    if (isr_retenido > 0) {
      steps.push({
        label: "Lo que las plataformas ya le pagaron al SAT por ti",
        value: -round2(isr_retenido),
        tone: "positive",
        citaLegal: "Art. 113-C LISR",
      });
    }
    steps.push({
      label: "ISR que aún debes pagar tú",
      value: isr_a_pagar,
      tone: isr_a_pagar > 0 ? "warning" : "positive",
    });
    if (iva_retenido > 0) {
      steps.push({
        label: "IVA retenido por las plataformas",
        value: -round2(iva_retenido),
        tone: "positive",
        citaLegal: "Art. 1-A LIVA",
      });
    }

    /* ─── Warnings inteligentes ───────────────────────────────────── */
    if (ingresos_brutos > 0 && isr_retenido === 0) {
      warnings.push(
        "No detectamos retenciones de tus plataformas este mes. " +
        "Eso significa que el ISR completo te toca pagarlo a ti directamente.",
      );
    }

    // Detectar si está cerca del límite anual para opción definitiva
    // (no podemos calcular el YTD aquí — eso lo hace el caller)

    return {
      regime: "plataformas",
      period,
      ingresos_brutos: round2(ingresos_brutos),
      deducciones_aplicadas: 0, // Plataformas no permite deducciones (cash bruto)
      base_gravable: round2(ingresos_brutos),
      isr_calculado: round2(isr_calculado),
      isr_retenido: round2(isr_retenido),
      isr_a_pagar,
      iva_trasladado: round2(iva_trasladado),
      iva_acreditable,
      iva_retenido: round2(iva_retenido),
      iva_a_pagar,
      total_a_pagar,
      steps,
      citas_legales: [
        "Art. 113-A LISR",
        "Art. 113-B LISR",
        "Art. 113-C LISR",
        "Art. 1-A fracc. II LIVA",
      ],
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },
};

/**
 * Determina si el contribuyente califica para opción pago definitivo
 * (Art. 113-B LISR). Si YES: la retención de la plataforma es definitiva
 * y NO hay declaración mensual ni anual por estos ingresos.
 *
 * @param ingresosYTD Suma de ingresos plataformas YTD del año fiscal
 * @returns true si puede optar por definitivo
 */
export function calificaOpcionDefinitiva(ingresosYTD: number): boolean {
  return ingresosYTD <= PLATAFORMAS_OPCION_DEFINITIVA_LIMITE_ANUAL;
}
