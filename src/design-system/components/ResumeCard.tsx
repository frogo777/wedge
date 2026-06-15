"use client";

/**
 * ResumeCard — Design System (Fase 2.5B · Progreso & Retención).
 *
 * Card de re-entrada al Mes Fiscal: "Retoma donde te quedaste". Interactiva
 * (hover lift) → "use client" + useState, self-contained.
 *
 * Render: surface + border + radius lg, padding 20. Hover sube a surface2 +
 * translateY(-1px) + borderStrong. Layout: ícono sutil (textMuted) + bloque
 * (title micro + description body) + CTA a la derecha.
 *
 * Conductual: baja la fricción de volver — recuerda el punto exacto y ofrece un
 * solo paso pequeño para continuar el mes.
 */
import { useState, type CSSProperties, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { wt } from "@/design-system/tokens";

export interface ResumeCardCta {
  label: string;
  onClick: () => void;
}

export interface ResumeCardProps {
  /** Encabezado sobrio. Default "Retoma donde te quedaste". */
  title?: string;
  /** Dónde se quedó, p.ej. "Te falta revisar IVA acreditable". */
  description: string;
  cta: ResumeCardCta;
  /** Ícono sutil a la izquierda. Default RotateCcw. */
  icon?: ReactNode;
  /** CTA primario (naranja) en vez de secundario. Úsalo con mesura. */
  primary?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function ResumeCard({
  title = "Retoma donde te quedaste",
  description,
  cta,
  icon,
  primary = false,
  className,
  style,
}: ResumeCardProps) {
  const [hover, setHover] = useState(false);
  const [ctaHover, setCtaHover] = useState(false);
  const [ctaActive, setCtaActive] = useState(false);

  const ctaBg = primary
    ? ctaActive
      ? wt.color.orangePressed
      : ctaHover
        ? wt.color.orangeHover
        : wt.color.orange
    : ctaHover
      ? wt.color.surface2
      : wt.color.surface;
  const ctaColor = primary ? wt.color.textInverse : wt.color.text;
  const ctaBorder = primary ? "transparent" : wt.color.border;

  return (
    <div
      className={className}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: wt.space[4],
        background: hover ? wt.color.surface2 : wt.color.surface,
        border: `1px solid ${hover ? wt.color.borderStrong : wt.color.border}`,
        borderRadius: wt.radius.lg,
        padding: wt.space[6],
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        transition: `background ${wt.motion.base} ${wt.motion.ease}, border-color ${wt.motion.base} ${wt.motion.ease}, transform ${wt.motion.base} ${wt.motion.ease}`,
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: wt.color.textMuted,
        }}
      >
        {icon ?? <RotateCcw size={20} strokeWidth={2} />}
      </span>

      <div style={{ display: "flex", flexDirection: "column", gap: wt.space[2], flex: 1, minWidth: 0 }}>
        <span style={{ ...wt.text.micro, color: wt.color.textMuted, fontFamily: wt.font.sans }}>
          {title}
        </span>
        <span style={{ ...wt.text.body, color: wt.color.text, fontFamily: wt.font.sans }}>
          {description}
        </span>
      </div>

      <button
        type="button"
        onClick={cta.onClick}
        onMouseEnter={() => setCtaHover(true)}
        onMouseLeave={() => {
          setCtaHover(false);
          setCtaActive(false);
        }}
        onMouseDown={() => setCtaActive(true)}
        onMouseUp={() => setCtaActive(false)}
        style={{
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          height: 40,
          padding: `0 ${wt.space[5]}px`,
          borderRadius: wt.radius.md,
          background: ctaBg,
          color: ctaColor,
          border: `1px solid ${ctaBorder}`,
          fontFamily: wt.font.sans,
          fontSize: 14,
          fontWeight: 560,
          cursor: "pointer",
          whiteSpace: "nowrap",
          transform: ctaActive ? "scale(0.98)" : "scale(1)",
          transition: `background ${wt.motion.fast} ${wt.motion.ease}, transform ${wt.motion.fast} ${wt.motion.ease}, border-color ${wt.motion.fast} ${wt.motion.ease}`,
        }}
      >
        {cta.label}
      </button>
    </div>
  );
}
