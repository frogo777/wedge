"use client";

/**
 * Button — Design System (Fase 2).
 *
 * Variantes: primary | secondary | ghost | danger | subtle
 * Estados: default, hover, active, disabled, loading
 * Regla: SOLO un primary dominante por pantalla (el naranja es escaso).
 */
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { wt } from "@/design-system/tokens";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { h: number; px: number; font: number; gap: number }> = {
  sm: { h: 32, px: 12, font: 13, gap: 6 },
  md: { h: 40, px: 16, font: 14, gap: 8 },
  lg: { h: 48, px: 20, font: 15, gap: 9 },
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const s = SIZES[size];
  const isDisabled = disabled || loading;

  const palette = (): { bg: string; color: string; border: string } => {
    switch (variant) {
      case "primary":
        return {
          bg: active ? wt.color.orangePressed : hover ? wt.color.orangeHover : wt.color.orange,
          color: wt.color.textInverse,
          border: "transparent",
        };
      case "danger":
        return {
          bg: active ? "#D8554C" : hover ? "#F47A71" : wt.color.danger,
          color: wt.color.textInverse,
          border: "transparent",
        };
      case "ghost":
        return {
          bg: hover ? wt.color.surface2 : "transparent",
          color: wt.color.textSecondary,
          border: "transparent",
        };
      case "subtle":
        return {
          bg: hover ? wt.color.surface2 : wt.color.surface,
          color: wt.color.text,
          border: wt.color.border,
        };
      case "secondary":
      default:
        return {
          bg: hover ? wt.color.surface2 : wt.color.surface,
          color: wt.color.text,
          border: hover ? wt.color.borderStrong : wt.color.border,
        };
    }
  };

  const p = palette();

  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      onMouseEnter={(e) => { setHover(true); rest.onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHover(false); setActive(false); rest.onMouseLeave?.(e); }}
      onMouseDown={(e) => { setActive(true); rest.onMouseDown?.(e); }}
      onMouseUp={(e) => { setActive(false); rest.onMouseUp?.(e); }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        height: s.h,
        padding: `0 ${s.px}px`,
        width: fullWidth ? "100%" : undefined,
        fontFamily: wt.font.sans,
        fontSize: s.font,
        fontWeight: 560,
        lineHeight: 1,
        letterSpacing: "0",
        color: p.color,
        background: p.bg,
        border: `1px solid ${p.border}`,
        borderRadius: wt.radius.md,
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled && !loading ? 0.5 : 1,
        transform: active && !isDisabled ? "scale(0.98)" : "scale(1)",
        transition: `background ${wt.motion.base} ${wt.motion.ease}, border-color ${wt.motion.base} ${wt.motion.ease}, transform ${wt.motion.fast} ${wt.motion.ease}`,
        userSelect: "none",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {loading ? (
        <span
          aria-hidden
          style={{
            width: s.font,
            height: s.font,
            border: `2px solid ${variant === "primary" || variant === "danger" ? "rgba(12,16,23,0.35)" : wt.color.border}`,
            borderTopColor: p.color,
            borderRadius: "50%",
            animation: "wds-spin 0.7s linear infinite",
          }}
        />
      ) : (
        leftIcon && <span style={{ display: "inline-flex", flexShrink: 0 }}>{leftIcon}</span>
      )}
      {children && <span>{children}</span>}
      {!loading && rightIcon && <span style={{ display: "inline-flex", flexShrink: 0 }}>{rightIcon}</span>}
    </button>
  );
}
