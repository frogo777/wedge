"use client";

/**
 * IconButton — Design System (Fase 2).
 *
 * Botón icónico cuadrado compacto (sin texto). Para acciones secundarias
 * densas: cerrar, expandir, más opciones, eliminar fila, etc.
 *
 * Variantes: default | ghost | danger
 * Sizes:     sm (28) | md (34) | lg (40) — cuadrados
 * Estados:   default, hover, active, disabled, loading
 *
 * Accesibilidad: `aria-label` es OBLIGATORIO (el botón no tiene texto visible).
 */
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { wt } from "@/design-system/tokens";

type Variant = "default" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { box: number; icon: number }> = {
  sm: { box: 28, icon: 16 },
  md: { box: 34, icon: 18 },
  lg: { box: 40, icon: 20 },
};

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** Ícono a renderizar (típicamente de lucide-react). Requerido. */
  icon: ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Descripción accesible obligatoria — el botón no tiene texto visible. */
  "aria-label": string;
}

export function IconButton({
  icon,
  variant = "default",
  size = "md",
  loading = false,
  disabled,
  style,
  ...rest
}: IconButtonProps) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const s = SIZES[size];
  const isDisabled = disabled || loading;

  const palette = (): { bg: string; color: string; border: string } => {
    switch (variant) {
      case "ghost":
        return {
          bg: hover ? wt.color.surface2 : "transparent",
          color: wt.color.textSecondary,
          border: "transparent",
        };
      case "danger":
        return {
          bg: hover ? wt.color.dangerBg : "transparent",
          color: wt.color.dangerInk,
          border: "transparent",
        };
      case "default":
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
        flexShrink: 0,
        width: s.box,
        height: s.box,
        padding: 0,
        color: p.color,
        background: p.bg,
        border: `1px solid ${p.border}`,
        borderRadius: wt.radius.md,
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled && !loading ? 0.5 : 1,
        transform: active && !isDisabled ? "scale(0.96)" : "scale(1)",
        transition: `background ${wt.motion.base} ${wt.motion.ease}, border-color ${wt.motion.base} ${wt.motion.ease}, transform ${wt.motion.fast} ${wt.motion.ease}`,
        userSelect: "none",
        ...style,
      }}
    >
      {loading ? (
        <span
          aria-hidden
          style={{
            width: s.icon,
            height: s.icon,
            border: `2px solid ${variant === "default" ? wt.color.border : "rgba(147,160,178,0.3)"}`,
            borderTopColor: p.color,
            borderRadius: "50%",
            animation: "wds-spin 0.7s linear infinite",
          }}
        />
      ) : (
        <span aria-hidden style={{ display: "inline-flex", flexShrink: 0 }}>
          {icon}
        </span>
      )}
    </button>
  );
}
