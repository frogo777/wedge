"use client";

/**
 * CtaLink — enlace de navegación con apariencia de botón del Design System.
 *
 * Para CTAs que NAVEGAN (no disparan lógica): evita el anti-patrón `<button>`
 * dentro de `<a>` y es seguro en páginas server-component (no pasa funciones).
 * El hover vive aquí (por eso "use client"), pero no recibe handlers externos.
 *
 * variant: primary (naranja UI · acción) · secondary (superficie + hairline) · ghost.
 */
import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { wt } from "@/design-system/tokens";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const SIZES: Record<Size, { h: number; px: number; font: number }> = {
  md: { h: 40, px: 16, font: 14 },
  lg: { h: 48, px: 22, font: 15 },
};

export function CtaLink({
  href,
  children,
  variant = "primary",
  size = "lg",
  leftIcon,
  rightIcon,
  style,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: CSSProperties;
  ariaLabel?: string;
}) {
  const [hover, setHover] = useState(false);
  const s = SIZES[size];

  const palette = (): { bg: string; color: string; border: string } => {
    switch (variant) {
      case "primary":
        return { bg: hover ? wt.color.orangeHover : wt.color.orange, color: wt.color.textInverse, border: "transparent" };
      case "ghost":
        return { bg: hover ? wt.color.surface2 : "transparent", color: wt.color.textSecondary, border: "transparent" };
      case "secondary":
      default:
        return { bg: hover ? wt.color.surface2 : wt.color.surface, color: wt.color.text, border: hover ? wt.color.borderStrong : wt.color.border };
    }
  };
  const p = palette();

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: s.h,
        padding: `0 ${s.px}px`,
        background: p.bg,
        color: p.color,
        border: `1px solid ${p.border}`,
        borderRadius: wt.radius.md,
        fontFamily: wt.font.sans,
        fontSize: s.font,
        fontWeight: 560,
        lineHeight: 1,
        textDecoration: "none",
        whiteSpace: "nowrap",
        transition: `background ${wt.motion.base} ${wt.motion.ease}, border-color ${wt.motion.base} ${wt.motion.ease}`,
        ...style,
      }}
    >
      {leftIcon}
      <span>{children}</span>
      {rightIcon}
    </Link>
  );
}
