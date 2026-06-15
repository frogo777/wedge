/**
 * Edge-case fiscal fixtures — 6 escenarios reales que freelancers MX
 * encuentran y que wedge debe calcular correctamente.
 *
 * Cada fixture define:
 *   - txs: array de Transactions sintéticas (representan CFDIs reales)
 *   - expected: el resultado esperado de buildMonthlyDeclaration
 *
 * Si wedge falla en alguno → debug + fix en el motor antes de Wave 2.
 */

import type { Transaction } from "../resico";

export interface EdgeCaseFixture {
  name: string;
  description: string;
  cite: string;
  periodo: string;
  txs: Transaction[];
  expected: {
    ingresosCobrados: number;
    ivaTrasladado: number;
    ivaAcreditable: number;
    isrRetenido: number;
    ivaRetenido: number;
    /** ISR a pagar (después de retenciones) — debe ser >= 0 */
    isrAPagar: number;
    /** Total a pagar al SAT (isr + max(iva, 0)) */
    totalAPagar: number;
  };
}

/**
 * Caso 1: Cliente persona moral retiene 10% ISR + 2/3 IVA
 *
 * Pago de PM a freelance Honorarios: $10,000 + IVA 16% = $11,600 bruto.
 * PM retiene: 10% ISR = $1,000 + 10.67% IVA = $1,066.67.
 * El freelance cobra neto $9,533.33 pero declara los $10,000 brutos.
 * Las retenciones se acreditan en la declaración mensual.
 */
export const CASE_PM_RETENTIONS: EdgeCaseFixture = {
  name: "Cliente PM retiene ISR + IVA",
  description: "Persona moral paga $10K a freelancer y retiene 10% ISR + 2/3 IVA (Art. 1-A LIVA, Art. 106 LISR)",
  cite: "Art. 106 LISR · Art. 1-A LIVA fracc. II",
  periodo: "2026-04",
  txs: [
    {
      id: "fixture-pm-1",
      description: "Servicios profesionales a Acme SA",
      amount: 10_000,
      type: "in",
      date: "2026-04-15",
      category: "ingresos",
      cfdi_status: "vigente",
      iva: 1_600,
      isr_retenido: 1_000,           // 10% del subtotal
      iva_retenido: 1_066.67,        // 2/3 del IVA
      efectivamente_cobrado: true,
      cfdi_tipo: "I",
      receptor_rfc: "ACM010101AB1",
    },
  ],
  expected: {
    ingresosCobrados: 10_000,
    ivaTrasladado: 1_600,
    ivaAcreditable: 0,
    isrRetenido: 1_000,
    ivaRetenido: 1_066.67,
    // ISR bruto RESICO PF tramo $10K = 1.00% → $100
    // ISR neto = 100 - 1000 = -900 → 0 (no aplica saldo a favor mensual)
    isrAPagar: 0,
    // IVA: 1600 - 0 - 1066.67 = 533.33 a pagar
    totalAPagar: 533.33,
  },
};

/**
 * Caso 2: Cliente USA (exportación de servicios) — 0% IVA, sin retención
 *
 * Servicios prestados a residente extranjero: IVA 0% (Art. 29 LIVA).
 * Sin retenciones porque la PM no es mexicana.
 * Aprovecha el ingreso para acreditar IVA de gastos.
 */
export const CASE_USA_CLIENT: EdgeCaseFixture = {
  name: "Cliente USA exportación de servicios",
  description: "Servicios a residente extranjero: 0% IVA, sin retención (Art. 29 LIVA)",
  cite: "Art. 29 LIVA fracc. IV · LISR cap. II",
  periodo: "2026-04",
  txs: [
    {
      id: "fixture-usa-1",
      description: "Diseño web para Acme Inc. (Delaware, USA)",
      amount: 20_000,
      type: "in",
      date: "2026-04-10",
      category: "ingresos",
      cfdi_status: "vigente",
      iva: 0,                        // 0% por exportación
      isr_retenido: 0,
      iva_retenido: 0,
      efectivamente_cobrado: true,
      cfdi_tipo: "I",
      receptor_rfc: "XEXX010101000",  // RFC genérico extranjero
    },
  ],
  expected: {
    ingresosCobrados: 20_000,
    ivaTrasladado: 0,
    ivaAcreditable: 0,
    isrRetenido: 0,
    ivaRetenido: 0,
    // ISR RESICO PF tramo $20K = 1.00% → $200
    isrAPagar: 200,
    totalAPagar: 200,
  },
};

/**
 * Caso 3: Plataforma digital (Uber/Rappi) retiene 1% ISR
 *
 * Plataformas obligadas a retener (Art. 113-A LISR). Retención fija:
 * 1% ISR sobre ingreso bruto para RESICO PF.
 */
export const CASE_PLATFORM_DIGITAL: EdgeCaseFixture = {
  name: "Plataforma digital (Uber/Rappi)",
  description: "Plataforma retiene 1% ISR automáticamente sobre cada viaje/orden",
  cite: "Art. 113-A LISR · LISR fracc. II",
  periodo: "2026-04",
  txs: [
    {
      id: "fixture-platform-1",
      description: "Ingresos Rappi abril 2026",
      amount: 15_000,
      type: "in",
      date: "2026-04-30",
      category: "ingresos",
      cfdi_status: "vigente",
      iva: 2_400,                    // 16% IVA
      isr_retenido: 150,             // 1% por Rappi
      iva_retenido: 0,               // las plataformas no retienen IVA
      efectivamente_cobrado: true,
      cfdi_tipo: "I",
      receptor_rfc: "RAP170502LM7",
    },
  ],
  expected: {
    ingresosCobrados: 15_000,
    ivaTrasladado: 2_400,
    ivaAcreditable: 0,
    isrRetenido: 150,
    ivaRetenido: 0,
    // ISR RESICO PF tramo $15K = 1.00% → $150
    // ISR neto = 150 - 150 = 0
    isrAPagar: 0,
    // IVA: 2400 a pagar
    totalAPagar: 2_400,
  },
};

/**
 * Caso 4: Frontera norte — IVA 8% (estímulo fiscal)
 *
 * Contribuyentes en zona fronteriza norte aplican IVA 8% en lugar de 16%
 * en CFDIs emitidos desde la región (Decreto DOF 31-dic-2018, extendido
 * hasta 2026 por DOF 27-jun-2024).
 */
export const CASE_FRONTERA_NORTE: EdgeCaseFixture = {
  name: "Frontera norte IVA 8%",
  description: "Freelancer en Tijuana emite CFDI con IVA 8% (estímulo zona fronteriza)",
  cite: "Decreto fronterizo DOF 31-dic-2018 · Art. 27 LIVA",
  periodo: "2026-04",
  txs: [
    {
      id: "fixture-frontera-1",
      description: "Consultoría a cliente local Tijuana",
      amount: 25_000,
      type: "in",
      date: "2026-04-20",
      category: "ingresos",
      cfdi_status: "vigente",
      iva: 2_000,                    // 8% en lugar de 16%
      isr_retenido: 0,
      iva_retenido: 0,
      efectivamente_cobrado: true,
      cfdi_tipo: "I",
      receptor_rfc: "TIJ010101AB1",
    },
  ],
  expected: {
    ingresosCobrados: 25_000,
    ivaTrasladado: 2_000,            // 8%
    ivaAcreditable: 0,
    isrRetenido: 0,
    ivaRetenido: 0,
    // ISR RESICO PF tramo $25K = 1.00% → $250
    isrAPagar: 250,
    totalAPagar: 2_250,
  },
};

/**
 * Caso 5: CFDI cancelado — NO debe contar en cálculo
 *
 * Si un CFDI se canceló (estado "cancelado"), wedge NO debe sumarlo.
 * Era el bug #5 del audit 2026-05 (sync-fixtures.test.ts).
 */
export const CASE_CANCELLED_CFDI: EdgeCaseFixture = {
  name: "CFDI cancelado debe excluirse",
  description: "Si user emitió un CFDI y luego lo canceló, NO suma al ingreso",
  cite: "CFF Art. 29-A fracc. IX · Audit 2026-05",
  periodo: "2026-04",
  txs: [
    // CFDI vigente — sí cuenta
    {
      id: "fixture-cancel-1",
      description: "Servicios prestados (vigente)",
      amount: 8_000,
      type: "in",
      date: "2026-04-05",
      category: "ingresos",
      cfdi_status: "vigente",
      iva: 1_280,
      isr_retenido: 0,
      iva_retenido: 0,
      efectivamente_cobrado: true,
      cfdi_tipo: "I",
      receptor_rfc: "ABC010101AB1",
    },
    // CFDI cancelado — NO cuenta
    {
      id: "fixture-cancel-2",
      description: "Servicios prestados (cancelado luego)",
      amount: 12_000,
      type: "in",
      date: "2026-04-12",
      category: "ingresos",
      cfdi_status: "cancelado",
      iva: 1_920,
      isr_retenido: 0,
      iva_retenido: 0,
      efectivamente_cobrado: true,
      cfdi_tipo: "I",
      receptor_rfc: "XYZ010101AB1",
    },
  ],
  expected: {
    ingresosCobrados: 8_000,         // solo el vigente
    ivaTrasladado: 1_280,
    ivaAcreditable: 0,
    isrRetenido: 0,
    ivaRetenido: 0,
    // ISR RESICO PF tramo $8K = 1.00% → $80
    isrAPagar: 80,
    totalAPagar: 80 + 1_280,         // = 1,360
  },
};

/**
 * Caso 6: Mezcla CFDI tipo I + tipo P (REP) — REP NO cuenta como ingreso nuevo
 *
 * Audit 2026-05: los CFDI tipo P (Complemento de Pago) son comprobantes
 * de cobro de PPDs previos, NO ingresos nuevos. Si se cuentan, se duplica.
 */
export const CASE_CFDI_TIPO_P: EdgeCaseFixture = {
  name: "CFDI tipo P (REP) no duplica ingreso",
  description: "REP es cobro de PPD previo. NO suma como ingreso nuevo.",
  cite: "Audit 2026-05 RESICO · LIVA cobro efectivo",
  periodo: "2026-04",
  txs: [
    // CFDI tipo I (ingreso original)
    {
      id: "fixture-rep-1",
      description: "Servicios PPD (Pago en Parcialidades)",
      amount: 30_000,
      type: "in",
      date: "2026-04-10",
      category: "ingresos",
      cfdi_status: "vigente",
      iva: 4_800,
      isr_retenido: 0,
      iva_retenido: 0,
      efectivamente_cobrado: true,
      cfdi_tipo: "I",
      receptor_rfc: "ABC010101AB1",
    },
    // CFDI tipo P (REP) — NO cuenta
    {
      id: "fixture-rep-2",
      description: "Complemento de pago primera parcialidad",
      amount: 15_000,
      type: "in",
      date: "2026-04-20",
      category: "ingresos",
      cfdi_status: "vigente",
      iva: 0,
      isr_retenido: 0,
      iva_retenido: 0,
      efectivamente_cobrado: true,
      cfdi_tipo: "P",                // REP — excluido del cálculo
      receptor_rfc: "ABC010101AB1",
    },
  ],
  expected: {
    ingresosCobrados: 30_000,        // solo el tipo I
    ivaTrasladado: 4_800,
    ivaAcreditable: 0,
    isrRetenido: 0,
    ivaRetenido: 0,
    // ISR RESICO PF tramo $30K = 1.10% → $330
    isrAPagar: 330,
    totalAPagar: 330 + 4_800,
  },
};

export const ALL_FIXTURES: EdgeCaseFixture[] = [
  CASE_PM_RETENTIONS,
  CASE_USA_CLIENT,
  CASE_PLATFORM_DIGITAL,
  CASE_FRONTERA_NORTE,
  CASE_CANCELLED_CFDI,
  CASE_CFDI_TIPO_P,
];
