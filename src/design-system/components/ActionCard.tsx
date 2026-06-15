"use client";

/**
 * ActionCard — Design System (Fase 2.5).
 *
 * La "siguiente acción" del Mes Fiscal — se lee como un ítem de lista de tareas
 * fiscales, NO como feature card. Sin chip de ícono de colores, sin glow.
 *
 * Variantes:
 *   recommended → regla izquierda naranja 2px + overline sobrio + CTA primary. El único naranja.
 *   neutral     → sin regla ni overline, CTA secondary.
 *   done        → regla verde + check + title tachado + atenuado (ya resuelto).
 */
import { useState, type CSSProperties, type ReactNode } from "react";
import { Check } from "lucide-react";
import { wt } from "@/design-system/tokens";

type Variant = "recommended" | "neutral" | "done";

export interface ActionCardCta {
  label: string;
  onClick: () => void;
}

export interface ActionCardProps {
  title: string;
  description?: string;
  /** Etiqueta sobria sobre el título — el "prompt contextual" de Fogg
   *  (p.ej. "Faltan 4 días para el día 17"). */
  overline?: string;
  /** Urgencia del prompt: tiñe el overline. calm=muted · soon=ámbar suave · due=ámbar.
   *  Nunca rojo (eso es riesgo real, no urgencia de fecha). */
  urgency?: "calm" | "soon" | "due";
  /** Ícono pequeño y monocromo junto al título (funcional, no decorativo). */
  icon?: ReactNode;
  cta?: ActionCardCta;
  variant?: Variant;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function ActionCard({
  title,
  description,
  overline,
  urgency,
  icon,
  cta,
  variant = "neutral",
  disabled = false,
  className,
  style,
}: ActionCardProps) {
  const [hover, setHover] = useState(false);
  const [ctaHover, setCtaHover] = useState(false);
  const [ctaActive, setCtaActive] = useState(false);

  const isDone = variant === "done";
  const isRec = variant === "recommended";
  const lift = hover && !disabled;

  const leftRule = isRec ? wt.color.orange : isDone ? wt.color.success : "transparent";
  const resolvedOverline = overline ?? (isRec ? "Recomendado" : undefined);

  const ctaBg = isRec
    ? ctaActive ? wt.color.orangePressed : ctaHover ? wt.color.orangeHover : wt.color.orange
    : ctaHover ? wt.color.surface2 : wt.color.surface;
  const ctaColor = isRec ? wt.color.textInverse : wt.color.text;
  const ctaBorder = isRec ? "transparent" : wt.color.border;

  return (
    <div
      className={className}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        gap: wt.space[4],
        alignItems: "flex-start",
        background: isDone ? wt.color.bgSecondary : wt.color.surface,
        border: `1px solid ${lift ? wt.color.borderStrong : wt.color.border}`,
        borderLeft: `2px solid ${leftRule === "transparent" ? wt.color.border : leftRule}`,
        borderRadius: wt.radius.lg,
        padding: `${wt.space[5]}px ${wt.space[6]}px`,
        opacity: disabled ? 0.5 : isDone ? 0.72 : 1,
        transform: lift ? "translateY(-1px)" : "translateY(0)",
        transition: `background ${wt.motion.base} ${wt.motion.ease}, border-color ${wt.motion.base} ${wt.motion.ease}, transform ${wt.motion.base} ${wt.motion.ease}`,
        pointerEvents: disabled ? "none" : "auto",
        ...style,
      }}
    >
      {isDone ? (
        <span aria-hidden="true" style={{ display: "inline-flex", flexShrink: 0, color: wt.color.success, marginTop: 2 }}>
          <Check size={18} strokeWidth={2.5} />
        </span>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: wt.space[2], flex: 1, minWidth: 0 }}>
        {resolvedOverline ? (
          <span style={{ ...wt.text.micro, color:
            urgency === "due" ? wt.color.warning
            : urgency === "soon" ? wt.color.warningInk
            : isRec ? wt.color.orangeInk
            : wt.color.textMuted }}>
            {resolvedOverline}
          </span>
        ) : null}

        <span style={{ display: "inline-flex", alignItems: "center", gap: wt.space[3] }}>
          {icon && !isDone ? (
            <span aria-hidden="true" style={{ display: "inline-flex", flexShrink: 0, color: wt.color.textMuted }}>{icon}</span>
          ) : null}
          <span
            style={{
              ...wt.text.h3,
              color: wt.color.text,
              textDecoration: isDone ? "line-through" : "none",
              textDecorationColor: isDone ? wt.color.textMuted : undefined,
            }}
          >
            {title}
          </span>
        </span>

        {description ? <span style={{ ...wt.text.bodySm, color: wt.color.textSecondary }}>{description}</span> : null}
      </div>

      {cta && !isDone ? (
        <button
          type="button"
          onClick={cta.onClick}
          disabled={disabled}
          onMouseEnter={() => setCtaHover(true)}
          onMouseLeave={() => { setCtaHover(false); setCtaActive(false); }}
          onMouseDown={() => setCtaActive(true)}
          onMouseUp={() => setCtaActive(false)}
          style={{
            flexShrink: 0,
            alignSelf: "center",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: 38,
            padding: `0 ${wt.space[5]}px`,
            borderRadius: wt.radius.md,
            background: ctaBg,
            color: ctaColor,
            border: `1px solid ${ctaBorder}`,
            fontFamily: wt.font.sans,
            fontSize: 14,
            fontWeight: 560,
            cursor: disabled ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
            transform: ctaActive ? "scale(0.98)" : "scale(1)",
            transition: `background ${wt.motion.fast} ${wt.motion.ease}, transform ${wt.motion.fast} ${wt.motion.ease}, border-color ${wt.motion.fast} ${wt.motion.ease}`,
          }}
        >
          {cta.label}
        </button>
      ) : null}
    </div>
  );
}
