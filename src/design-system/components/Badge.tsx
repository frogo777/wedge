/**
 * Badge — Design System (Fase 2).
 *
 * Etiqueta NO-estado, compacta (categoría, conteo, tag, "Nuevo", etc.).
 * Estático (sin interacción → función plana, sin "use client").
 *
 * Para ESTADO FISCAL usa StatusChip (siempre con ícono). Badge es solo texto.
 */
import type { CSSProperties, HTMLAttributes } from "react";
import { wt } from "@/design-system/tokens";

type Variant =
  | "neutral"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "outline";

type Size = "sm" | "md";

interface VariantSpec {
  bg: string;
  color: string;
  border: string;
}

const VARIANTS: Record<Variant, VariantSpec> = {
  neutral: { bg: wt.color.neutralBg, color: wt.color.textSecondary, border: "transparent" },
  accent:  { bg: wt.color.orangeMuted, color: wt.color.orangeInk,  border: "transparent" },
  info:    { bg: wt.color.infoBg,     color: wt.color.infoInk,     border: "transparent" },
  success: { bg: wt.color.successBg,  color: wt.color.successInk,  border: "transparent" },
  warning: { bg: wt.color.warningBg,  color: wt.color.warningInk,  border: "transparent" },
  danger:  { bg: wt.color.dangerBg,   color: wt.color.dangerInk,   border: "transparent" },
  outline: { bg: "transparent",       color: wt.color.textSecondary, border: wt.color.border },
};

const SIZES: Record<Size, { h: number; px: number; text: CSSProperties }> = {
  sm: { h: 18, px: 6, text: wt.text.micro },
  md: { h: 22, px: 8, text: wt.text.caption },
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  size?: Size;
}

export function Badge({ variant = "neutral", size = "sm", children, style, ...rest }: BadgeProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];

  return (
    <span
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: s.h,
        padding: `0 ${s.px}px`,
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        borderRadius: wt.radius.pill,
        fontFamily: wt.font.sans,
        ...s.text,
        lineHeight: 1,
        whiteSpace: "nowrap",
        userSelect: "none",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
