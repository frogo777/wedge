import type { CSSProperties } from "react";
import { wt } from "@/design-system/tokens";

type Variant = "block" | "inline";

export interface LoadingStateProps {
  /** Mensaje principal — humano y específico. Default: "Armando tu mes fiscal…". */
  message?: string;
  /** Sub-mensaje opcional (solo en `block`), p.ej. "Detectando CFDIs…". */
  subMessage?: string;
  /** `block` centra y agranda; `inline` cabe en una fila junto a otro contenido. */
  variant?: Variant;
}

const RING = {
  block: 32,
  inline: 16,
} as const;

/**
 * LoadingState — carga PREMIUM. Anillo grafito con arco naranja girando (wds-spin)
 * + mensaje. Estático: el spinner es CSS puro, no requiere "use client".
 */
export function LoadingState({
  message = "Armando tu mes fiscal…",
  subMessage,
  variant = "block",
}: LoadingStateProps) {
  const ringSize = RING[variant];

  // Anillo: borde grafito tenue con un único lado naranja → arco que gira.
  const spinner: CSSProperties = {
    width: ringSize,
    height: ringSize,
    borderRadius: wt.radius.pill,
    border: `${variant === "block" ? 3 : 2}px solid ${wt.color.border}`,
    borderTopColor: wt.color.orange,
    animation: "wds-spin 0.7s linear infinite",
    flexShrink: 0,
  };

  if (variant === "inline") {
    return (
      <span
        role="status"
        aria-live="polite"
        aria-busy="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: wt.space[3],
          fontFamily: wt.font.sans,
        }}
      >
        <span style={spinner} aria-hidden="true" />
        <span style={{ ...wt.text.bodySm, color: wt.color.textSecondary }}>
          {message}
        </span>
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: wt.space[5],
        padding: wt.space[10],
        fontFamily: wt.font.sans,
      }}
    >
      <span style={spinner} aria-hidden="true" />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: wt.space[2],
          alignItems: "center",
        }}
      >
        <span style={{ ...wt.text.body, color: wt.color.textSecondary }}>
          {message}
        </span>
        {subMessage ? (
          <span style={{ ...wt.text.bodySm, color: wt.color.textMuted }}>
            {subMessage}
          </span>
        ) : null}
      </div>
    </div>
  );
}
