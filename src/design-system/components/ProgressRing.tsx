/**
 * ProgressRing — Design System (Fase 2).
 *
 * Anillo SVG de progreso para el Mes Fiscal. Estático: función plana.
 * Track bgTertiary, progreso en color de variante. % al centro en Geist Mono.
 * Sin glow — profundidad por jerarquía, no por brillo.
 *
 * Uso típico:
 *   <ProgressRing value={62} showValue label="del mes" />
 *   <ProgressRing value={100} variant="success" showValue />
 */
import type { CSSProperties } from "react";
import { wt } from "@/design-system/tokens";

type Variant = "default" | "success" | "warning";

const PROGRESS_COLOR: Record<Variant, string> = {
  default: wt.color.orange,
  success: wt.color.success,
  warning: wt.color.warning,
};

export interface ProgressRingProps {
  /** Progreso 0–100. */
  value?: number;
  /** Diámetro del anillo en px. Default 96. */
  size?: number;
  /** Grosor del trazo en px. Default 8. */
  stroke?: number;
  /** Color del progreso. */
  variant?: Variant;
  /** Texto pequeño bajo el porcentaje (centro). */
  label?: string;
  /** Muestra el porcentaje (mono) al centro. */
  showValue?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function ProgressRing({
  value = 0,
  size = 96,
  stroke = 8,
  variant = "default",
  label,
  showValue = false,
  className,
  style,
}: ProgressRingProps) {
  const pct = Math.round(Math.min(Math.max(value, 0), 100));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);
  const center = size / 2;
  const progress = PROGRESS_COLOR[variant];

  return (
    <div
      className={className}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        style={{ transform: "rotate(-90deg)", display: "block" }}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={wt.color.bgTertiary}
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={progress}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: `stroke-dashoffset ${wt.motion.slow} ${wt.motion.ease}`,
          }}
        />
      </svg>

      {(showValue || label) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            pointerEvents: "none",
          }}
        >
          {showValue && (
            <span
              className="wds-mono"
              style={{
                fontFamily: wt.font.mono,
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
                fontSize: Math.max(13, Math.round(size * 0.22)),
                lineHeight: 1,
                letterSpacing: "-0.01em",
                color: wt.color.text,
              }}
            >
              {pct}%
            </span>
          )}
          {label && (
            <span
              style={{
                ...wt.text.caption,
                fontFamily: wt.font.sans,
                color: wt.color.textMuted,
                textAlign: "center",
                maxWidth: size - stroke * 2,
              }}
            >
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
