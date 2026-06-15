/**
 * CFDI Engine — modelo local (Fase 5A).
 *
 * Capa intermedia entre el parser CFDI 4.0 (`@/lib/cfdi-parser`, modelo `ParsedCFDI`)
 * y el Mes Fiscal (`@/lib/mes/types`). Convierte un comprobante técnico en una señal
 * con estado/impacto/dirección, lista para producir pendientes y métricas.
 *
 * PRIVACIDAD: el RFC se guarda ENMASCARADO por defecto (`issuerRfcMasked`/`receiverRfcMasked`).
 * El motor NO persiste e.firma/CIEC/datos SAT. Las funciones son puras (sin DB/red/IO).
 *
 * OJO: existe otro `NormalizedCfdi` (pobre) en `@/lib/sat/provider` para el flujo SAT real.
 * Este es independiente y más rico; se resuelve por ruta de módulo (`@/lib/cfdi/types`).
 */

import type { CFDIConcepto } from "@/lib/cfdi-parser";

export type { ParsedCFDI } from "@/lib/cfdi-parser";

/** Tipo documental del CFDI (mapea a TipoDeComprobante I/E/P/N/T). */
export type CfdiType = "ingreso" | "egreso" | "pago" | "nomina" | "traslado" | "desconocido";

/** Dirección desde la perspectiva del usuario (según su RFC vs emisor/receptor). */
export type CfdiDirection = "emitido" | "recibido" | "desconocido";

/**
 * Estado del CFDI individual (no confundir con MesEstado, que es el ciclo del mes).
 * Mapea a los StatusKind del Design System para los ReviewItem.
 */
export type CfdiStatus =
  | "detectado"            // encontrado, sin revisar
  | "requiereRevision"     // necesita atención (IVA dudoso, retención, dato incompleto)
  | "confirmado"           // revisado y aceptado
  | "excluido"             // no cuenta este mes
  | "cancelado"            // cancelado en SAT (metadata, no del XML)
  | "pendienteComplemento" // PPD sin su complemento de pago (REP)
  | "desconocido";

export interface NormalizedCfdiTaxes {
  /** IVA trasladado (002). En ingresos = a tu cargo; en gastos = potencialmente acreditable. */
  ivaTrasladado: number;
  /** IVA retenido (002 retención). */
  ivaRetenido: number;
  /** ISR retenido (001 retención). */
  isrRetenido: number;
}

export interface NormalizedConcept {
  description: string;
  claveProdServ: string;
  amount: number;
}

export interface NormalizedCfdi {
  /** Id estable y NO sensible para la UI (derivado, no es el UUID crudo). */
  id: string;
  /**
   * UUID del timbre (SINTÉTICO en los fixtures 5A). null si no timbrado.
   * ⚠️ Fase 5B: con CFDIs reales este campo es un identificador fiscal sensible (permite
   * consultar/cancelar en SAT). Antes de serializar este objeto al cliente con datos reales,
   * decidir si el UUID crudo debe viajar al bundle o exponer solo el `id` hasheado.
   */
  uuid: string | null;
  version: string;
  /** Tipo documental. */
  type: CfdiType;
  /** Dirección respecto al usuario. */
  direction: CfdiDirection;
  /** ISO de emisión (Fecha del comprobante). */
  issuedAt: string;
  /** Periodo "YYYY-MM" derivado de issuedAt (o de fechaPago para tipo P). */
  monthKey: string;
  issuerName: string;
  /** RFC del emisor ENMASCARADO (p. ej. "DEM******B1"). */
  issuerRfcMasked: string;
  receiverName: string;
  /** RFC del receptor ENMASCARADO. */
  receiverRfcMasked: string;
  subtotal: number;
  total: number;
  currency: string;
  /** PUE / PPD (MetodoPago). */
  paymentMethod: string | null;
  /** FormaPago (01..99). */
  paymentForm: string | null;
  /** UsoCFDI del receptor. */
  cfdiUse: string;
  status: CfdiStatus;
  taxes: NormalizedCfdiTaxes;
  concepts: NormalizedConcept[];
  /** Origen del dato. En 5A siempre fixture ficticio. */
  source: "fixture" | "xml" | "zip" | "sat";
  /** Lo que el motor NO pudo determinar (no se inventa). */
  warnings: string[];
}

/** Metadata externa al XML (estatus SAT real no viaja en el comprobante). */
export interface CfdiExternalMeta {
  /** Simula el estatus que daría el SAT. En 5A solo para fixtures cancelados. */
  satStatus?: "vigente" | "cancelado";
  /** Si un PPD ya tiene su complemento de pago asociado. */
  hasComplementoPago?: boolean;
  /** Si el gasto es deducible (clasificación previa). */
  deducible?: boolean;
}

export type { CFDIConcepto };
