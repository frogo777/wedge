"use client";

import {
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { wt } from "@/design-system/tokens";

export type AlertVariant = "info" | "success" | "warning" | "danger" | "trust";

interface VariantStyle {
  /** Color del ícono y del borde (tono del state). */
  accent: string;
  /** Fondo sunken sutil del tono. */
  bg: string;
  /** Borde sutil del tono (rgba para mantenerlo calmado). */
  border: string;
  /** Ícono por defecto del state. */
  Icon: LucideIcon;
}

const VARIANTS: Record<AlertVariant, VariantStyle> = {
  info: {
    accent: wt.color.info,
    bg: wt.color.infoBg,
    border: "rgba(111,143,175,0.30)",
    Icon: Info,
  },
  success: {
    accent: wt.color.success,
    bg: wt.color.successBg,
    border: "rgba(77,159,111,0.30)",
    Icon: CheckCircle2,
  },
  warning: {
    accent: wt.color.warning,
    bg: wt.color.warningBg,
    border: "rgba(201,147,58,0.30)",
    Icon: AlertTriangle,
  },
  danger: {
    accent: wt.color.danger,
    // dangerBg sunken sutil — danger se ve serio, NO rojo chillón de fondo.
    bg: wt.color.dangerBg,
    border: "rgba(216,92,74,0.30)",
    Icon: AlertCircle,
  },
  trust: {
    accent: wt.color.trustBlueGray,
    bg: wt.color.trustPanel,
    border: "rgba(100,116,139,0.24)",
    Icon: ShieldCheck,
  },
};

export interface AlertProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Tono del alert. Define ícono, color de acento y fondo sunken. */
  variant?: AlertVariant;
  /** Título corto (wt.text.label). Opcional. */
  title?: ReactNode;
  /** Cuerpo del mensaje (wt.text.bodySm, textSecondary). */
  children?: ReactNode;
  /** Override del ícono del state (cualquier nodo, típicamente un lucide icon). */
  icon?: ReactNode;
  /** Acción opcional alineada a la derecha (p. ej. un Button o link). */
  action?: ReactNode;
  /** Si se pasa, muestra botón X de cierre. Se invoca al pulsarlo. */
  onDismiss?: () => void;
}

export function Alert({
  variant = "info",
  title,
  children,
  icon,
  action,
  onDismiss,
  style,
  ...rest
}: AlertProps) {
  const [dismissHover, setDismissHover] = useState(false);
  const v = VARIANTS[variant];

  const containerStyle: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: wt.space[4],
    padding: `${wt.space[4]}px ${wt.space[4]}px`,
    background: v.bg,
    border: `1px solid ${v.border}`,
    borderRadius: wt.radius.md,
    fontFamily: wt.font.sans,
    ...style,
  };

  return (
    <div role="alert" style={containerStyle} {...rest}>
      {/* Ícono del state (o override) — color del tono */}
      <span
        aria-hidden={icon ? undefined : true}
        style={{
          display: "inline-flex",
          flexShrink: 0,
          color: v.accent,
          // alinea el ícono con la primera línea de texto
          marginTop: 1,
        }}
      >
        {icon ?? <v.Icon size={18} strokeWidth={2} aria-hidden="true" />}
      </span>

      {/* Contenido: title + body */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: title && children ? wt.space[2] : 0,
        }}
      >
        {title != null && (
          <div style={{ ...wt.text.label, color: wt.color.text }}>{title}</div>
        )}
        {children != null && (
          <div style={{ ...wt.text.bodySm, color: wt.color.textSecondary }}>
            {children}
          </div>
        )}
      </div>

      {/* Acción opcional */}
      {action != null && (
        <div style={{ flexShrink: 0, display: "inline-flex", alignItems: "center" }}>
          {action}
        </div>
      )}

      {/* Botón de cierre */}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          onMouseEnter={() => setDismissHover(true)}
          onMouseLeave={() => setDismissHover(false)}
          aria-label="Cerrar aviso"
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            marginTop: -2,
            marginRight: -4,
            padding: 0,
            border: "none",
            borderRadius: wt.radius.sm,
            background: dismissHover ? wt.color.surface2 : "transparent",
            color: dismissHover ? wt.color.text : wt.color.textMuted,
            cursor: "pointer",
            transition: `background ${wt.motion.fast} ${wt.motion.ease}, color ${wt.motion.fast} ${wt.motion.ease}`,
          }}
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
