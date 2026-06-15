/**
 * MetricCard — Design System (Fase 2).
 *
 * Dato fiscal con estado. Superficie premium (surface + borde hairline + aire),
 * label micro uppercase, valor grande en mono tabular, helper, y una fila inferior
 * con status (p. ej. un StatusChip), trend y/o action.
 *
 * Estático por defecto. Con `loading` muestra un skeleton (wds-pulse) sin
 * necesidad de interacción, por eso NO requiere "use client".
 */
import type { CSSProperties, ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react";
import { wt } from "@/design-system/tokens";

type TrendDir = "up" | "down" | "flat";

export interface MetricTrend {
  /** Texto del cambio, p. ej. "+12%" o "3 CFDIs". */
  value: string;
  dir: TrendDir;
}

export interface MetricCardProps {
  label: string;
  value: string | number;
  helper?: string;
  /** Normalmente un StatusChip; cualquier ReactNode válido. */
  status?: ReactNode;
  trend?: MetricTrend;
  /** Acción opcional (p. ej. un Button), alineada a la derecha de la fila inferior. */
  action?: ReactNode;
  loading?: boolean;
  className?: string;
  style?: CSSProperties;
}

const TREND_META: Record<TrendDir, { color: string; Icon: typeof ArrowRight }> = {
  up: { color: wt.color.success, Icon: ArrowUpRight },
  down: { color: wt.color.danger, Icon: ArrowDownRight },
  flat: { color: wt.color.textMuted, Icon: ArrowRight },
};

function SkeletonBar({ width, height }: { width: number | string; height: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: wt.radius.sm,
        background: wt.color.surface2,
        animation: "wds-pulse 1.4s ease-in-out infinite",
      }}
    />
  );
}

export function MetricCard({
  label,
  value,
  helper,
  status,
  trend,
  action,
  loading = false,
  className,
  style,
}: MetricCardProps) {
  const shell: CSSProperties = {
    background: wt.color.surface,
    border: `1px solid ${wt.color.border}`,
    borderRadius: wt.radius.lg,
    padding: 20,
    boxShadow: "none", // plano y calmado — la jerarquía la da el dato, no la sombra
    display: "flex",
    flexDirection: "column",
    gap: wt.space[3],
    ...style,
  };

  if (loading) {
    return (
      <div className={className} style={shell} aria-busy="true" aria-live="polite">
        <SkeletonBar width={96} height={11} />
        <SkeletonBar width={150} height={30} />
        <SkeletonBar width={120} height={12} />
      </div>
    );
  }

  const t = trend ? TREND_META[trend.dir] : null;
  const hasFooter = !!status || !!trend || !!action;

  return (
    <div className={className} style={shell}>
      <span style={{ ...wt.text.micro, color: wt.color.textMuted }}>{label}</span>

      <span
        className="wds-mono"
        style={{ ...wt.data.xl, fontFamily: wt.font.mono, color: wt.color.text }}
      >
        {value}
      </span>

      {helper ? (
        <span style={{ ...wt.text.bodySm, color: wt.color.textMuted }}>{helper}</span>
      ) : null}

      {hasFooter ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: wt.space[4],
            flexWrap: "wrap",
            marginTop: wt.space[1],
          }}
        >
          {status}

          {t ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: wt.space[2],
                color: t.color,
                ...wt.text.label,
              }}
            >
              <t.Icon size={16} strokeWidth={2.25} aria-hidden="true" />
              <span style={{ fontFamily: wt.font.mono, fontVariantNumeric: "tabular-nums" }}>
                {trend!.value}
              </span>
            </span>
          ) : null}

          {action ? <span style={{ marginLeft: "auto" }}>{action}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
