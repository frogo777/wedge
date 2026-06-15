/**
 * MonthProgress — Design System (Fase 2.5B · Progreso & Retención).
 *
 * Progreso del Mes Fiscal en una sola lectura: "Junio 2026 está 64% listo".
 * Estático (sin interacción): función plana, SIN "use client".
 *
 * Render:
 *   headline (h3) que combina month + percent, con el porcentaje en mono tabular.
 *   barra de progreso (track bgTertiary, fill orange — o success si 100%, radius
 *   pill, height 8, transición de width con wt.motion.slow).
 *   si hay counts → tally "Listo N · Falta N · Sigue N" con dots de color.
 *
 * Conductual: muestra avance sin alarmar; el verde a 100% premia el cierre del mes.
 */
import type { CSSProperties } from "react";
import { wt } from "@/design-system/tokens";

const TRACK_HEIGHT = 8;

export interface MonthProgressProps {
  /** Mes fiscal, p.ej. "Junio 2026". */
  month: string;
  /** Progreso del mes 0–100. */
  percent: number;
  /** Conteo de pasos resueltos. */
  ready?: number;
  /** Conteo de pasos que faltan. */
  pending?: number;
  /** Conteo de pasos que siguen. */
  next?: number;
  className?: string;
  style?: CSSProperties;
}

interface TallyItem {
  label: string;
  value: number;
  dot: string;
}

const dotStyle = (color: string): CSSProperties => ({
  display: "inline-block",
  width: 7,
  height: 7,
  borderRadius: wt.radius.pill,
  background: color,
  flexShrink: 0,
});

export function MonthProgress({
  month,
  percent,
  ready,
  pending,
  next,
  className,
  style,
}: MonthProgressProps) {
  const pct = Math.min(Math.max(Math.round(percent), 0), 100);
  const complete = pct === 100;
  const fill = complete ? wt.color.success : wt.color.orange;

  const tally: TallyItem[] = [];
  if (typeof ready === "number") tally.push({ label: "Listo", value: ready, dot: wt.color.success });
  if (typeof pending === "number") tally.push({ label: "Falta", value: pending, dot: wt.color.warning });
  if (typeof next === "number") tally.push({ label: "Sigue", value: next, dot: wt.color.orangeInk });

  return (
    <div className={className} style={{ width: "100%", ...style }}>
      {/* Headline: mes + porcentaje en una sola frase clara */}
      <p
        style={{
          ...wt.text.h3,
          fontFamily: wt.font.sans,
          color: wt.color.text,
          margin: 0,
          marginBottom: wt.space[4],
        }}
      >
        {month} está{" "}
        <span
          className="wds-mono"
          style={{
            fontFamily: wt.font.mono,
            fontVariantNumeric: "tabular-nums",
            color: complete ? wt.color.success : wt.color.text,
          }}
        >
          {pct}%
        </span>{" "}
        listo
      </p>

      {/* Barra de progreso */}
      <div
        role="progressbar"
        aria-label={`${month} está ${pct}% listo`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        style={{
          position: "relative",
          width: "100%",
          height: TRACK_HEIGHT,
          background: wt.color.bgTertiary,
          borderRadius: wt.radius.pill,
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            height: "100%",
            width: `${pct}%`,
            background: fill,
            borderRadius: wt.radius.pill,
            transition: `width ${wt.motion.slow} ${wt.motion.ease}, background ${wt.motion.base} ${wt.motion.ease}`,
          }}
        />
      </div>

      {/* Tally de conteos (opcional) */}
      {tally.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: wt.space[4],
            marginTop: wt.space[4],
          }}
        >
          {tally.map((t, i) => (
            <span
              key={t.label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: wt.space[4],
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: wt.space[2],
                  ...wt.text.label,
                  fontFamily: wt.font.sans,
                  color: wt.color.textSecondary,
                }}
              >
                <span aria-hidden style={dotStyle(t.dot)} />
                {t.label}{" "}
                <span
                  className="wds-mono"
                  style={{
                    fontFamily: wt.font.mono,
                    fontVariantNumeric: "tabular-nums",
                    color: wt.color.text,
                  }}
                >
                  {t.value}
                </span>
              </span>
              {i < tally.length - 1 && (
                <span aria-hidden style={{ color: wt.color.textMuted }}>
                  ·
                </span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
