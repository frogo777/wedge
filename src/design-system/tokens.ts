/**
 * Wedge Design System — design tokens (Fase 2).
 *
 * Dark-only, grafito premium, naranja controlado #F36F21, tipografía Geist.
 * Los colores referencian CSS vars `--wds-*` (definidas en `ds.css`) para que
 * todo componente que use `wt.color.*` quede centralizado en un solo origen.
 *
 * Patrón de uso (inline styles, igual que el resto del repo):
 *   import { wt } from "@/design-system/tokens";
 *   <div style={{ background: wt.color.surface, color: wt.color.text }} />
 *
 * NO mezclar con `@/app/tokens` (sistema light heredado). Este es el sistema nuevo.
 */

import type { CSSProperties } from "react";

export const wt = {
  color: {
    // ── Brand ──
    // orangeLogo = #F36F21 (marca, SOLO LogoLockup). orange = #E65F1A (UI/CTA/acción).
    orangeLogo:    "var(--wds-orange-logo)",
    orange:        "var(--wds-orange)",
    orangeHover:   "var(--wds-orange-hover)",
    orangePressed: "var(--wds-orange-pressed)",
    orangeMuted:   "var(--wds-orange-muted)",
    orangeInk:     "var(--wds-orange-ink)",

    // ── Backgrounds (grafito, sin negro puro) ──
    bgPrimary:   "var(--wds-bg-primary)",
    bgSecondary: "var(--wds-bg-secondary)",
    bgTertiary:  "var(--wds-bg-tertiary)",

    // ── Surfaces ──
    surface:         "var(--wds-surface-primary)",
    surface2:        "var(--wds-surface-secondary)",
    surfaceElevated: "var(--wds-surface-elevated)",

    // ── Text ──
    text:          "var(--wds-text-primary)",
    textSecondary: "var(--wds-text-secondary)",
    textMuted:     "var(--wds-text-muted)",
    textInverse:   "var(--wds-text-inverse)",

    // ── Border ──
    border:       "var(--wds-border-subtle)",
    borderStrong: "var(--wds-border-strong)",
    borderFocus:  "var(--wds-border-focus)",

    // ── Trust (azul-gris: confianza, info, calma) ──
    trustBlueGray: "var(--wds-trust-bluegray)",
    trustSlate:    "var(--wds-trust-slate)",
    trustPanel:    "var(--wds-trust-panel)",
    trustInk:      "var(--wds-trust-ink)",

    // ── States (fg / sunken bg / ink legible) ──
    success:    "var(--wds-success)",
    successBg:  "var(--wds-success-bg)",
    successInk: "var(--wds-success-ink)",
    warning:    "var(--wds-warning)",
    warningBg:  "var(--wds-warning-bg)",
    warningInk: "var(--wds-warning-ink)",
    danger:     "var(--wds-danger)",
    dangerBg:   "var(--wds-danger-bg)",
    dangerInk:  "var(--wds-danger-ink)",
    info:       "var(--wds-info)",
    infoBg:     "var(--wds-info-bg)",
    infoInk:    "var(--wds-info-ink)",
    neutral:    "var(--wds-neutral)",
    neutralBg:  "var(--wds-neutral-bg)",
  },

  font: {
    sans: "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "var(--font-geist-mono), ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  },

  /** Escala tipográfica. Cada entrada es spreadeable en `style`. */
  text: {
    displayXl: { fontSize: 56, lineHeight: "60px", letterSpacing: "-0.03em",  fontWeight: 700 },
    displayLg: { fontSize: 44, lineHeight: "48px", letterSpacing: "-0.025em", fontWeight: 700 },
    h1:        { fontSize: 32, lineHeight: "38px", letterSpacing: "-0.02em",  fontWeight: 640 },
    h2:        { fontSize: 24, lineHeight: "30px", letterSpacing: "-0.015em", fontWeight: 600 },
    h3:        { fontSize: 19, lineHeight: "26px", letterSpacing: "-0.01em",  fontWeight: 600 },
    bodyLg:    { fontSize: 17, lineHeight: "26px", letterSpacing: "0",        fontWeight: 400 },
    body:      { fontSize: 15, lineHeight: "22px", letterSpacing: "0",        fontWeight: 400 },
    bodySm:    { fontSize: 13.5, lineHeight: "20px", letterSpacing: "0",      fontWeight: 400 },
    label:     { fontSize: 13, lineHeight: "16px", letterSpacing: "0",        fontWeight: 550 },
    caption:   { fontSize: 12, lineHeight: "16px", letterSpacing: "0.005em",  fontWeight: 500 },
    micro:     { fontSize: 11, lineHeight: "14px", letterSpacing: "0.08em",   fontWeight: 600, textTransform: "uppercase" as const },
  } satisfies Record<string, CSSProperties>,

  /** Datos fiscales — Geist Mono + tabular-nums. Spreadear + añadir fontFamily mono. */
  data: {
    xl: { fontSize: 30, lineHeight: "36px", letterSpacing: "-0.01em", fontWeight: 600, fontVariantNumeric: "tabular-nums" as const },
    md: { fontSize: 15, lineHeight: "20px", letterSpacing: "0",       fontWeight: 500, fontVariantNumeric: "tabular-nums" as const },
  } satisfies Record<string, CSSProperties>,

  /** Spacing base 4px. */
  space: { 0: 0, 1: 2, 2: 4, 3: 8, 4: 12, 5: 16, 6: 20, 7: 24, 8: 32, 9: 40, 10: 48, 12: 64, 16: 96 } as const,

  radius: { sm: 6, md: 10, lg: 14, xl: 18, pill: 999 } as const,

  shadow: {
    sm:    "0 1px 2px rgba(0,0,0,0.4)",
    md:    "0 6px 20px -6px rgba(0,0,0,0.5)",
    lg:    "0 16px 40px -12px rgba(0,0,0,0.6)",
    focus: "0 0 0 3px rgba(230,95,26,0.30)",
    /** highlight interior sutil para superficies elevadas */
    innerTop: "inset 0 1px 0 rgba(255,255,255,0.05)",
  } as const,

  motion: {
    fast: "120ms",
    base: "180ms",
    slow: "280ms",
    ease: "cubic-bezier(0.23, 1, 0.32, 1)",
  } as const,

  maxWidth: { app: 1120, reading: 680, modal: 560 } as const,
  breakpoint: { sm: 640, md: 768, lg: 1024, xl: 1280 } as const,
} as const;

export type WedgeTokens = typeof wt;
