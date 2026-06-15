"use client";

/**
 * Card — Design System (Fase 2.5).
 *
 * Jerarquía deliberada (no todas las cards pesan igual):
 *   hero        → protagonista: leve gradiente + highlight superior + sombra suave, radio xl.
 *   default     → estructura calmada: superficie + hairline, SIN sombra (plano).
 *   elevated    → flotante: surfaceElevated + sombra md (modales/popovers).
 *   interactive → como default, con lift en hover.
 *   quiet       → casi sin chrome: well bgSecondary, SIN borde ni sombra (contenido secundario).
 *   muted/dark  → wells de agrupación.
 *   trust       → panel de confianza/seguridad (blue-gray).
 *   warning     → panel de precaución (ámbar sutil).
 *
 * Profundidad por jerarquía de superficie, no por sombras grandes ni glow.
 */
import { useState, type CSSProperties, type ReactNode, type MouseEventHandler } from "react";
import { wt } from "@/design-system/tokens";

type Variant =
  | "default" | "hero" | "elevated" | "interactive"
  | "quiet" | "muted" | "dark" | "trust" | "warning";
type Padding = "none" | "compact" | "default" | "comfortable";

const PAD: Record<Padding, number> = { none: 0, compact: 16, default: 20, comfortable: 28 };

interface Base { bg: string; border: string; shadow: string; radius: number }

function baseFor(variant: Variant): Base {
  switch (variant) {
    case "hero":
      return {
        bg: "linear-gradient(180deg, #19212C 0%, #10151D 62%)",
        border: wt.color.border,
        shadow: `${wt.shadow.md}, ${wt.shadow.innerTop}`,
        radius: wt.radius.xl,
      };
    case "elevated":
      return { bg: wt.color.surfaceElevated, border: wt.color.border, shadow: `${wt.shadow.md}, ${wt.shadow.innerTop}`, radius: wt.radius.lg };
    case "quiet":
      return { bg: wt.color.bgSecondary, border: "transparent", shadow: "none", radius: wt.radius.lg };
    case "muted":
      return { bg: wt.color.bgSecondary, border: wt.color.border, shadow: "none", radius: wt.radius.lg };
    case "dark":
      return { bg: wt.color.bgPrimary, border: wt.color.border, shadow: "none", radius: wt.radius.lg };
    case "trust":
      return { bg: wt.color.trustPanel, border: "rgba(100,116,139,0.20)", shadow: "none", radius: wt.radius.lg };
    case "warning":
      return { bg: wt.color.warningBg, border: "rgba(201,147,58,0.28)", shadow: "none", radius: wt.radius.lg };
    case "interactive":
    case "default":
    default:
      return { bg: wt.color.surface, border: wt.color.border, shadow: "none", radius: wt.radius.lg };
  }
}

export interface CardProps {
  variant?: Variant;
  padding?: Padding;
  onClick?: MouseEventHandler<HTMLDivElement>;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

export function Card({
  variant = "default",
  padding = "default",
  onClick,
  children,
  className,
  style,
  ariaLabel,
}: CardProps) {
  const [hover, setHover] = useState(false);
  const isInteractive = variant === "interactive" || !!onClick;
  const b = baseFor(variant);
  const hovered = isInteractive && hover;

  return (
    <div
      className={className}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onMouseEnter={() => isInteractive && setHover(true)}
      onMouseLeave={() => isInteractive && setHover(false)}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e as unknown as React.MouseEvent<HTMLDivElement>); } } : undefined}
      style={{
        background: hovered ? wt.color.surface2 : b.bg,
        border: `1px solid ${hovered ? wt.color.borderStrong : b.border}`,
        borderRadius: b.radius,
        padding: PAD[padding],
        boxShadow: hovered ? wt.shadow.sm : b.shadow,
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        transition: `background ${wt.motion.base} ${wt.motion.ease}, border-color ${wt.motion.base} ${wt.motion.ease}, transform ${wt.motion.base} ${wt.motion.ease}`,
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
