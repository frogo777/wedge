/**
 * Tipos compartidos para motores fiscales por régimen.
 *
 * Cada régimen nuevo (Plataformas, Arrendamiento, Anual, Honorarios-completo)
 * implementa la interface `RegimeEngine` y produce un `RegimeResult` que el
 * UI + luk + breakdown-structured pueden renderizar uniformemente.
 *
 * RESICO y Honorarios actuales NO usan esta interface todavía — coexisten
 * mientras se hace la migración incremental (ver Architecture-Expansion-Audit).
 */

export type RegimeKey =
  | "resico_pf"
  | "honorarios"
  | "plataformas"
  | "arrendamiento"
  | "anual";

/** Sub-tipo de plataforma — determina tasa de retención. */
export type PlataformaTipo =
  | "TRANSPORTE"   // Uber, DiDi, Cabify, Beat — 2.5% ISR
  | "ENTREGA"      // Rappi, UberEats, DiDiFood — 2.1% ISR
  | "HOSPEDAJE"    // Airbnb, Booking, Vrbo — 4.0% ISR
  | "MARKETPLACE"  // MercadoLibre, Amazon, Etsy — 4.0% ISR
  | "OTRO";        // Foránea sin retención local (Fiverr/Upwork)

/** Línea individual del breakdown (compatible con breakdown-structured.ts). */
export interface BreakdownStep {
  label: string;
  value: number | null;
  formula?: string;
  citaLegal?: string;
  tone?: "neutral" | "positive" | "warning" | "danger";
}

export interface RegimeResult {
  regime: RegimeKey;
  period: string; // "YYYY-MM"
  /** Total cobrado en el periodo. */
  ingresos_brutos: number;
  /** Total deducible aplicado al cálculo. */
  deducciones_aplicadas: number;
  /** Base sobre la que se aplica la tarifa. */
  base_gravable: number;
  /** ISR teórico antes de retenciones. */
  isr_calculado: number;
  /** ISR ya retenido por terceros (plataformas, patrón, etc). */
  isr_retenido: number;
  /** ISR a pagar = isr_calculado − isr_retenido. Puede ser negativo (saldo a favor). */
  isr_a_pagar: number;
  /** IVA cobrado al cliente. */
  iva_trasladado: number;
  /** IVA pagado a proveedores y acreditable. */
  iva_acreditable: number;
  /** IVA retenido por terceros (plataformas 8%). */
  iva_retenido: number;
  /** IVA a pagar = trasladado − acreditable − retenido. Negativo = saldo a favor. */
  iva_a_pagar: number;
  /** Total a pagar al SAT este periodo. */
  total_a_pagar: number;
  /** Desglose paso a paso para UI + luk. */
  steps: BreakdownStep[];
  /** Citas legales (formato "Art. 113-A LISR"). */
  citas_legales: string[];
  /** Warnings/avisos no bloqueantes para el user. */
  warnings?: string[];
}

export interface RegimeOptions {
  /** Año de tarifas a usar — para periodos históricos. Default: actual. */
  fiscalYear?: number;
  /** Frontera norte: IVA 8% en lugar de 16%. */
  fronteraNorte?: boolean;
}

export interface RegimeEngine {
  key: RegimeKey;
  name: string;
  calculate(
    transactions: Transaction[],
    period: string,
    opts?: RegimeOptions,
  ): RegimeResult;
}

/** Reuso del tipo Transaction canónico de resico.ts. */
export type Transaction = {
  id: string;
  amount: number;
  type: "in" | "out";
  date: string;          // ISO YYYY-MM-DD
  description?: string;
  category?: string | null;
  cfdi_status?: string | null;
  forma_pago?: string | null;
  /** RFC del emisor del CFDI (si hay). Crítico para clasificación por plataforma. */
  emisor_rfc?: string | null;
  /** ISR retenido por la plataforma/patrón (CFDI con sello de retención). */
  isr_retenido?: number | null;
  /** IVA retenido por la plataforma/patrón. */
  iva_retenido?: number | null;
  /** IVA trasladado al cliente (si emiti CFDI). */
  iva_trasladado?: number | null;
  /** IVA acreditable (en CFDIs recibidos). */
  iva_acreditable?: number | null;
};
