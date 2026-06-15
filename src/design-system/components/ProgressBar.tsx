/**
 * ProgressBar — Design System (Fase 2).
 *
 * Barra lineal de progreso. Estática (sin interacción): función plana.
 * El modo `indeterminate` se anima vía CSS (keyframe "wds-indeterminate").
 *
 * Track bgTertiary, radius pill, height 8. Fill con transición de width
 * (wt.motion.slow). Si hay label/showValue, fila superior con label + %.
 *
 * Uso típico:
 *   <ProgressBar value={62} label="Traer CFDIs" showValue />
 *   <ProgressBar indeterminate label="Listo para validar" />
 */
import type { CSSProperties, HTMLAttributes } from "react";
import { wt } from "@/design-system/tokens";

type Variant = "default" | "success";

const TRACK_HEIGHT = 8;

const FILL_COLOR: Record<Variant, string> = {
  default: wt.color.orange,
  success: wt.color.success,
};

export interface ProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Progreso 0–100 (relativo a `max`). Ignorado si `indeterminate`. */
  value?: number;
  /** Tope de la escala. Default 100. */
  max?: number;
  /** Color del fill. */
  variant?: Variant;
  /** Etiqueta de texto encima de la barra. */
  label?: string;
  /** Muestra el porcentaje (mono) a la derecha del label. */
  showValue?: boolean;
  /** Progreso desconocido: animación deslizante continua. */
  indeterminate?: boolean;
}

export function ProgressBar({
  value = 0,
  max = 100,
  variant = "default",
  label,
  showValue = false,
  indeterminate = false,
  style,
  ...rest
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const ratio = indeterminate ? 0 : Math.min(Math.max(value, 0), safeMax) / safeMax;
  const pct = Math.round(ratio * 100);
  const fill = FILL_COLOR[variant];

  const showHeader = Boolean(label) || showValue;

  const headerRow: CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: wt.space[4],
    marginBottom: wt.space[3],
  };

  return (
    <div
      {...rest}
      role="progressbar"
      aria-label={label}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-valuenow={indeterminate ? undefined : pct}
      style={{ width: "100%", ...style }}
    >
      {showHeader && (
        <div style={headerRow}>
          {label && (
            <span
              style={{
                ...wt.text.label,
                color: wt.color.textSecondary,
                fontFamily: wt.font.sans,
              }}
            >
              {label}
            </span>
          )}
          {showValue && !indeterminate && (
            <span
              className="wds-mono"
              style={{
                ...wt.data.md,
                fontFamily: wt.font.mono,
                color: wt.color.text,
                fontSize: 13,
              }}
            >
              {pct}%
            </span>
          )}
        </div>
      )}

      <div
        style={{
          position: "relative",
          width: "100%",
          height: TRACK_HEIGHT,
          background: wt.color.bgTertiary,
          borderRadius: wt.radius.pill,
          overflow: "hidden",
        }}
      >
        {indeterminate ? (
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: "40%",
              background: fill,
              borderRadius: wt.radius.pill,
              animation: "wds-indeterminate 1.4s ease-in-out infinite",
            }}
          />
        ) : (
          <div
            aria-hidden
            style={{
              height: "100%",
              width: `${pct}%`,
              background: fill,
              borderRadius: wt.radius.pill,
              transition: `width ${wt.motion.slow} ${wt.motion.ease}`,
            }}
          />
        )}
      </div>
    </div>
  );
}
