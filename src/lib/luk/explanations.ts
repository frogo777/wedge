/**
 * luk Explain Cards (Fase 6B) — convierte una señal en una explicación útil y segura.
 *
 * Determinístico: une la `LukSignal` (qué detectó, impacto, acción) con el `FiscalConcept`
 * (qué significa, qué revisar, límite, nivel de fuente). Sin LLM, sin red. Lenguaje informativo,
 * sin certeza absoluta; nunca "validado por SAT". Si falta concepto, usa un fallback seguro.
 */

import type { LukSignal, LukSignalType, LukConfidence } from "./types";
import type { SourceLevel } from "@/lib/fiscal-knowledge/types";
import { getConceptForSignalType } from "@/lib/fiscal-knowledge";

const DISCLAIMER = "Estimado informativo. Wedge prepara; tú validas en SAT.";
const LIMIT = "Wedge no conoce tu situación completa ni valida nada en SAT.";

export interface LukExplanation {
  signalId: string;
  title: string;
  /** Qué significa (definición corta). */
  plainExplanation: string;
  /** Por qué importa para tu mes. */
  whyItMatters: string;
  /** Qué revisar (preguntas concretas). */
  whatToReview: string[];
  /** Qué sabe Wedge (lo detectado, informativo). */
  whatWedgeKnows: string;
  /** Qué NO sabe / límite honesto. */
  whatWedgeDoesNotKnow: string;
  /** Siguiente acción. */
  nextAction: string;
  confidence: LukConfidence;
  /** Disclaimer corto y seguro. */
  userSafeDisclaimer: string;
  sourceKind: SourceLevel;
  /** Ids de conceptos relacionados. */
  relatedConcepts: string[];
}

/** Construye una explain card a partir de una señal (une con el concepto fiscal). */
export function buildLukExplanation(signal: LukSignal): LukExplanation {
  const concept = getConceptForSignalType(signal.type);

  if (!concept) {
    // Fallback seguro: sin concepto curado, no inventamos contenido fiscal.
    return {
      signalId: signal.id,
      title: signal.title,
      plainExplanation: signal.summary,
      whyItMatters: signal.impact,
      whatToReview: [signal.nextAction],
      whatWedgeKnows: "Detectamos esta señal en tus datos de este navegador (estimado informativo).",
      whatWedgeDoesNotKnow: `${LIMIT} Si no estás seguro, consulta a un contador.`,
      nextAction: signal.nextAction,
      confidence: signal.confidence,
      userSafeDisclaimer: DISCLAIMER,
      sourceKind: "requires_review",
      relatedConcepts: [],
    };
  }

  return {
    signalId: signal.id,
    title: signal.title,
    plainExplanation: concept.shortDefinition,
    // Solo la explicación conceptual (evita eco con signal.impact, que es casi lo mismo en varios tipos).
    whyItMatters: concept.userSafeExplanation,
    whatToReview: concept.reviewQuestions,
    // Frase fija (no interpola signal.summary): el detalle ya se muestra aparte y evita pasar texto dinámico.
    whatWedgeKnows: "Detectamos esta señal en tus datos de este navegador (estimado informativo).",
    whatWedgeDoesNotKnow: `${concept.caution} ${LIMIT}`.trim(),
    nextAction: signal.nextAction,
    confidence: signal.confidence,
    userSafeDisclaimer: DISCLAIMER,
    sourceKind: concept.sourceLevel,
    relatedConcepts: [concept.id],
  };
}

/** Construye explicaciones para una lista de señales (preserva el orden ya rankeado). */
export function buildLukExplanations(signals: LukSignal[]): LukExplanation[] {
  return signals.map(buildLukExplanation);
}

/**
 * Explicación a nivel CONCEPTO (sin una señal específica), p. ej. para mostrar el significado de
 * un tipo. Devuelve null si no hay concepto curado para ese tipo.
 */
export function getExplanationForSignalType(type: LukSignalType): LukExplanation | null {
  const concept = getConceptForSignalType(type);
  if (!concept) return null;
  return {
    signalId: "",
    title: concept.title,
    plainExplanation: concept.shortDefinition,
    whyItMatters: concept.userSafeExplanation,
    whatToReview: concept.reviewQuestions,
    whatWedgeKnows: "Esta es una explicación general del concepto (estimado informativo).",
    whatWedgeDoesNotKnow: `${concept.caution} ${LIMIT}`.trim(),
    nextAction: "Revisa este punto en tu Mes Fiscal.",
    confidence: "media",
    userSafeDisclaimer: DISCLAIMER,
    sourceKind: concept.sourceLevel,
    relatedConcepts: [concept.id],
  };
}

const CONFIDENCE_RANK: Record<LukConfidence, number> = { alta: 2, media: 1 };

/**
 * Re-rankea explicaciones por confianza (alta primero), estable. El orden primario por severidad
 * ya viene de rankLukSignals sobre las señales; esto es un desempate secundario.
 */
export function rankExplanations(explanations: LukExplanation[]): LukExplanation[] {
  return [...explanations]
    .map((e, i) => ({ e, i }))
    .sort((a, b) => CONFIDENCE_RANK[b.e.confidence] - CONFIDENCE_RANK[a.e.confidence] || a.i - b.i)
    .map((x) => x.e);
}
