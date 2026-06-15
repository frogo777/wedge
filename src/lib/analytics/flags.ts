/**
 * Feature flags via PostHog.
 *
 * Cada flag tiene un literal type para evitar drift de nombres entre
 * código y el dashboard de PostHog. Cuando se agrega un flag nuevo,
 * agregarlo aquí y en el dashboard de PostHog con el mismo key.
 *
 * Uso:
 *   const variant = useFeatureFlag(FLAGS.HERO_VARIANT, "control");
 *   if (variant === "variant_b") <HeroNew /> else <HeroOriginal />
 *
 * Si PostHog no está inicializado o el flag no existe, useFeatureFlag
 * devuelve el `fallback`. Eso garantiza que la UI nunca se rompe por
 * ausencia de analytics.
 */

"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { isPosthogEnabled } from "@/lib/posthog";

export const FLAGS = {
  /** A/B test del hero copy (Sprint 1 S1.1) — variants: "control" | "variant_b" */
  HERO_VARIANT: "hero-copy-variant",
  /** Demo mockup embebido en landing (Sprint 1 S1.3) — "off" | "on" */
  DEMO_MODE: "demo-mode-enabled",
  /** Dashboard zero-state simplificado (Sprint 1 Ola 2) — "v1" | "v2" */
  DASHBOARD_ZERO_STATE: "zero-state-v2",
} as const;

export type FlagKey = (typeof FLAGS)[keyof typeof FLAGS];

/**
 * React hook que retorna el valor actual del flag para el user actual.
 * Re-renderiza cuando PostHog recibe el payload de flags (puede tomar
 * 50-200ms post-init).
 */
export function useFeatureFlag<T extends string = string>(
  flag: FlagKey,
  fallback: T,
): T {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    if (!isPosthogEnabled()) {
      setValue(fallback);
      return;
    }
    // PostHog dispatches `onFeatureFlags` cuando el bootstrap llega.
    const update = () => {
      try {
        const v = posthog.getFeatureFlag(flag);
        if (typeof v === "string") setValue(v as T);
        else if (v === true) setValue("on" as T);
        else if (v === false) setValue("off" as T);
        else setValue(fallback);
      } catch {
        setValue(fallback);
      }
    };
    update();
    // posthog.onFeatureFlags(cb) only available after init; defensively call
    try {
      posthog.onFeatureFlags(update);
    } catch {
      /* noop — flags ya disponibles o posthog no listo */
    }
  }, [flag, fallback]);

  return value;
}

/** Helper síncrono (sin React). Útil para event handlers que necesitan
 *  saber qué variante está activa en el momento del click. */
export function getFlagValue<T extends string = string>(
  flag: FlagKey,
  fallback: T,
): T {
  if (typeof window === "undefined") return fallback;
  if (!isPosthogEnabled()) return fallback;
  try {
    const v = posthog.getFeatureFlag(flag);
    if (typeof v === "string") return v as T;
    if (v === true) return "on" as T;
    if (v === false) return "off" as T;
    return fallback;
  } catch {
    return fallback;
  }
}
