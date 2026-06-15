/**
 * Structured breakdown del cálculo ISR/IVA.
 *
 * Las funciones de math (resico.ts, honorarios.ts) devuelven un
 * `breakdown: string[]` simple para compat con PDFs/emails. Esta lib
 * convierte cualquier `MonthlyDeclaration` a un array de pasos con
 * estructura para que el UI pueda renderizarlos con tipografía,
 * tooltips, citas legales, y diferenciación visual entre subtotales
 * y totales.
 *
 * Cumple promesa "wedge te muestra de dónde sale el número" — el user
 * Fundador paga $99/mes, debe ver paso a paso por qué le sale ese ISR.
 *
 * Pure functions — testables sin DB, importables en client + server.
 */

export type BreakdownStepKind =
  | "input"      // Dato base (ingreso, gasto)
  | "rate"       // Tasa aplicada (% o cuota fija)
  | "calculation" // Operación intermedia (× tasa)
  | "deduction"  // Resta (retención, pago previo)
  | "subtotal"   // Subtotal de bloque (ISR bruto, IVA neto)
  | "total"      // Total final del periodo
  | "info";      // Solo informativo, sin valor numérico

export interface BreakdownStep {
  /** Etiqueta principal del paso. Spanish, sin jerga. */
  label: string;
  /** Valor numérico (MXN); null para pasos info. */
  value: number | null;
  /** Tipo visual del paso. */
  kind: BreakdownStepKind;
  /** Cita legal (LISR, CFF, RMF). Renderiza como tooltip "según ___" */
  citaLegal?: string;
  /** Tooltip explicativo extendido. */
  tooltip?: string;
  /** Sub-pasos (cálculos intermedios). */
  detail?: string;
  /** Color tema para el valor: positivo (ingreso), negativo (deducción), neutro. */
  tone?: "income" | "deduction" | "neutral";
}

export interface IsrBreakdown {
  periodo: string;
  regimen: "resico_pf" | "honorarios" | "arrendamiento" | "asalariado" | "general_pm";
  steps: BreakdownStep[];
  totalAPagar: number;
}

/* ─── helpers ─────────────────────────────────────── */

const fmtMxn = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

const fmtPct = (r: number) => (r * 100).toFixed(2) + "%";

/* ─── RESICO PF ──────────────────────────────────────
 * Cálculo simple: ingresos × tasa del bracket. Sin gastos deducibles.
 */
export interface ResicoBreakdownInput {
  periodo: string;
  ingresosCobrados: number;
  bracketLimit: number;
  bracketRate: number;
  isrBruto: number;
  isrRetenido: number;
  isrAPagar: number;
  ivaTrasladado: number;
  ivaAcreditable: number;
  ivaRetenido: number;
  ivaAPagar: number;
  ivaSaldoAFavor: number;
  totalAPagar: number;
}

export function buildResicoBreakdown(d: ResicoBreakdownInput): IsrBreakdown {
  const steps: BreakdownStep[] = [
    {
      label: `Ingresos efectivamente cobrados en ${d.periodo}`,
      value: d.ingresosCobrados,
      kind: "input",
      tone: "income",
      citaLegal: "Art. 113-G fracc. III LISR — base es lo cobrado, no lo facturado.",
      tooltip: "Solo cuenta lo que tu cliente te pagó este mes. Las facturas pendientes (PPD) no entran hasta que se cobren.",
    },
    {
      label: `Tasa RESICO aplicable`,
      value: d.bracketRate,
      kind: "rate",
      detail: `Tu ingreso cae en el tramo hasta ${fmtMxn(d.bracketLimit)} → tasa ${fmtPct(d.bracketRate)}`,
      citaLegal: "Art. 113-E LISR — tabla mensual RESICO PF (1.0% a 2.5%).",
      tooltip: "RESICO PF aplica una tasa fija sobre tu ingreso bruto, sin deducciones. La tasa depende del tramo de ingreso mensual.",
    },
    {
      label: `ISR bruto del mes`,
      value: d.isrBruto,
      kind: "calculation",
      detail: `${fmtMxn(d.ingresosCobrados)} × ${fmtPct(d.bracketRate)}`,
      tone: "neutral",
    },
  ];

  if (d.isrRetenido > 0) {
    steps.push({
      label: `ISR retenido por terceros`,
      value: -d.isrRetenido,
      kind: "deduction",
      tone: "deduction",
      citaLegal: "Art. 113-J LISR — plataformas digitales y personas morales retienen 1.25% del ingreso.",
      tooltip: "Si trabajas en Uber/Rappi/Mercado Libre o cobras a empresas, ellas ya retuvieron parte de tu ISR. Eso se resta de lo que tú pagas.",
    });
  }

  steps.push({
    label: `ISR a pagar al SAT`,
    value: d.isrAPagar,
    kind: "subtotal",
    tone: "neutral",
    detail: d.isrRetenido > 0 ? `${fmtMxn(d.isrBruto)} − ${fmtMxn(d.isrRetenido)}` : undefined,
  });

  // IVA section (solo si hay actividad gravada)
  if (d.ivaTrasladado > 0 || d.ivaAcreditable > 0) {
    steps.push({ label: "IVA del mes", value: null, kind: "info" });
    steps.push({
      label: `IVA trasladado (cobrado a clientes)`,
      value: d.ivaTrasladado,
      kind: "input",
      tone: "income",
      citaLegal: "Art. 1 LIVA — el IVA se entera al SAT, no es tu ingreso.",
    });
    if (d.ivaAcreditable > 0) {
      steps.push({
        label: `IVA acreditable (gastos con CFDI)`,
        value: -d.ivaAcreditable,
        kind: "deduction",
        tone: "deduction",
        citaLegal: "Art. 5 LIVA — gastos pagados, con CFDI timbrado, indispensables.",
      });
    }
    if (d.ivaRetenido > 0) {
      steps.push({
        label: `IVA retenido por morales`,
        value: -d.ivaRetenido,
        kind: "deduction",
        tone: "deduction",
        citaLegal: "Art. 1-A frac. II LIVA — empresas retienen 2/3 del IVA.",
      });
    }
    if (d.ivaAPagar > 0) {
      steps.push({
        label: `IVA a pagar al SAT`,
        value: d.ivaAPagar,
        kind: "subtotal",
        tone: "neutral",
      });
    } else if (d.ivaSaldoAFavor > 0) {
      steps.push({
        label: `IVA a favor (puedes acreditar próximo mes)`,
        value: d.ivaSaldoAFavor,
        kind: "info",
        tone: "income",
      });
    }
  }

  steps.push({
    label: `Total a pagar al SAT este mes`,
    value: d.totalAPagar,
    kind: "total",
    tone: "neutral",
    detail: d.ivaAPagar > 0 ? `ISR ${fmtMxn(d.isrAPagar)} + IVA ${fmtMxn(d.ivaAPagar)}` : undefined,
  });

  return {
    periodo: d.periodo,
    regimen: "resico_pf",
    steps,
    totalAPagar: d.totalAPagar,
  };
}

/* ─── Honorarios (Art. 14 LISR — acumulado) ──────────
 * Más complejo: tabla acumulada YTD, deducciones reales, retenciones
 * acumuladas, pagos provisionales previos.
 */
export interface HonorariosBreakdownInput {
  periodo: string;
  numeroMes: number; // 1..12
  ingresosAcumulados: number;
  ingresosMes: number;
  gastosAcumulados: number;
  gastosMes: number;
  baseAcumulada: number;
  bracketLimit: number;
  bracketRate: number;
  cuotaFija: number;
  excedente: number;
  isrAcumulado: number;
  isrRetenidoAcumulado: number;
  pagosProvisionalesPrevios: number;
  isrEsteMes: number;
  ivaTrasladado: number;
  ivaAcreditable: number;
  ivaRetenido: number;
  ivaAPagar: number;
  ivaSaldoAFavor: number;
  totalAPagar: number;
}

export function buildHonorariosBreakdown(d: HonorariosBreakdownInput): IsrBreakdown {
  const steps: BreakdownStep[] = [
    {
      label: `Cálculo acumulado enero–${d.periodo.split("-")[1]}`,
      value: null,
      kind: "info",
      tooltip: "Honorarios usa base acumulada Art. 14 LISR — sumamos ingresos y gastos del año hasta este mes.",
    },
    {
      label: `Ingresos cobrados YTD`,
      value: d.ingresosAcumulados,
      kind: "input",
      tone: "income",
      citaLegal: "Art. 102 LISR — ingreso es lo efectivamente cobrado.",
      detail: `Solo este mes: ${fmtMxn(d.ingresosMes)}`,
    },
    {
      label: `Gastos deducibles YTD`,
      value: -d.gastosAcumulados,
      kind: "deduction",
      tone: "deduction",
      citaLegal: "Art. 103 LISR — gastos pagados con CFDI, indispensables, bancarizados si > $2,000.",
      detail: `Solo este mes: ${fmtMxn(d.gastosMes)}`,
    },
    {
      label: `Base gravable acumulada`,
      value: d.baseAcumulada,
      kind: "subtotal",
      tone: "neutral",
      detail: `${fmtMxn(d.ingresosAcumulados)} − ${fmtMxn(d.gastosAcumulados)}`,
    },
    {
      label: `Tarifa Art. 96 LISR — tramo aplicable`,
      value: d.bracketRate,
      kind: "rate",
      citaLegal: `Art. 96 LISR (tabla mensual × ${d.numeroMes} meses)`,
      detail: `Tramo: hasta ${fmtMxn(d.bracketLimit)} · cuota fija ${fmtMxn(d.cuotaFija)} · ${fmtPct(d.bracketRate)} sobre excedente`,
    },
    {
      label: `ISR acumulado YTD`,
      value: d.isrAcumulado,
      kind: "calculation",
      detail: `${fmtMxn(d.cuotaFija)} + ${fmtMxn(d.excedente)} × ${fmtPct(d.bracketRate)}`,
      tone: "neutral",
    },
  ];

  if (d.isrRetenidoAcumulado > 0) {
    steps.push({
      label: `ISR retenido por morales (10%)`,
      value: -d.isrRetenidoAcumulado,
      kind: "deduction",
      tone: "deduction",
      citaLegal: "Art. 106 LISR penúltimo párrafo — empresas retienen 10% al pagarte honorarios.",
      tooltip: "Cuando una empresa te paga, retiene 10% de tus honorarios. Esa retención se descuenta de tu pago provisional.",
    });
  }

  if (d.pagosProvisionalesPrevios > 0) {
    steps.push({
      label: `Pagos provisionales meses anteriores`,
      value: -d.pagosProvisionalesPrevios,
      kind: "deduction",
      tone: "deduction",
      citaLegal: "Art. 14 LISR — los pagos previos del año se acreditan contra el ISR acumulado.",
    });
  }

  steps.push({
    label: `ISR a pagar este mes`,
    value: d.isrEsteMes,
    kind: "subtotal",
    tone: "neutral",
  });

  // IVA section
  if (d.ivaTrasladado > 0 || d.ivaAcreditable > 0) {
    steps.push({ label: "IVA del mes (no acumula)", value: null, kind: "info" });
    steps.push({
      label: `IVA trasladado en cobros`,
      value: d.ivaTrasladado,
      kind: "input",
      tone: "income",
    });
    if (d.ivaAcreditable > 0) {
      steps.push({
        label: `IVA acreditable en gastos`,
        value: -d.ivaAcreditable,
        kind: "deduction",
        tone: "deduction",
        citaLegal: "Art. 5 LIVA",
      });
    }
    if (d.ivaRetenido > 0) {
      steps.push({
        label: `IVA retenido por morales`,
        value: -d.ivaRetenido,
        kind: "deduction",
        tone: "deduction",
        citaLegal: "Art. 1-A LIVA",
      });
    }
    if (d.ivaAPagar > 0) {
      steps.push({
        label: `IVA a pagar al SAT`,
        value: d.ivaAPagar,
        kind: "subtotal",
        tone: "neutral",
      });
    } else if (d.ivaSaldoAFavor > 0) {
      steps.push({
        label: `IVA a favor`,
        value: d.ivaSaldoAFavor,
        kind: "info",
        tone: "income",
      });
    }
  }

  steps.push({
    label: `Total a pagar al SAT este mes`,
    value: d.totalAPagar,
    kind: "total",
    tone: "neutral",
  });

  return {
    periodo: d.periodo,
    regimen: "honorarios",
    steps,
    totalAPagar: d.totalAPagar,
  };
}
