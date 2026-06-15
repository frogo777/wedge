/**
 * IVA — tasa aplicable según perfil del contribuyente.
 *
 * Por defecto la tasa general es 16% (Art. 1 LIVA). Existe un estímulo
 * fiscal vigente para Región Fronteriza Norte y Sur que permite acreditar
 * el 50% de la tasa de IVA, resultando en una tasa efectiva de 8% sobre
 * actos realizados dentro de la región. Vigente hasta 31-dic-2026 según
 * Decreto DOF 31-dic-2025.
 *
 * El estímulo NO es automático por estado/ciudad: requiere registro en el
 * Padrón de Beneficiarios SAT y ≥90% de ingresos en la región. Por eso
 * lo manejamos como una bandera explícita en `profiles.iva_frontera` que
 * el usuario activa en onboarding/settings.
 *
 * Para CFDIs ya importados, el IVA viene fijo en `tx.iva` (lo que el
 * emisor declaró). Esta función se usa solo cuando hay que CALCULAR el
 * IVA desde cero (calcIsrArrendamiento, simulador, calculadora).
 */

export const IVA_GENERAL  = 0.16;
export const IVA_FRONTERA = 0.08;

export interface IvaRateInput {
  iva_frontera?: boolean | null;
}

/** Tasa de IVA aplicable al usuario. Default 16% (general). */
export function getIVARate(profile?: IvaRateInput | null): number {
  return profile?.iva_frontera === true ? IVA_FRONTERA : IVA_GENERAL;
}
