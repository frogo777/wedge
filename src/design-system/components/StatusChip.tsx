/**
 * StatusChip — Design System (Fase 2).
 *
 * Chip de ESTADO FISCAL. Estático (sin interacción → función plana, sin "use client").
 * Mapea 11 estados del flujo fiscal a {color, bg (sunken), icon, label}.
 *
 * Regla de accesibilidad: el estado NUNCA se comunica solo por color.
 * SIEMPRE se renderiza ícono + texto juntos.
 */
import type { CSSProperties, HTMLAttributes } from "react";
import {
  CircleDashed,
  Inbox,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  Calculator,
  CircleSlash,
  Loader,
  Sigma,
  ShieldCheck,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react";
import { wt } from "@/design-system/tokens";

/** Las 11 claves de estado fiscal soportadas. */
export type StatusKind =
  | "sinDatos"
  | "detectado"
  | "requiereRevision"
  | "confirmado"
  | "excluido"
  | "impacta"
  | "noImpacta"
  | "enRevision"
  | "estimado"
  | "listoValidar"
  | "presentado";

type Size = "sm" | "md";

interface StatusSpec {
  /** Color del ícono y texto (ink legible sobre el bg sunken). */
  ink: string;
  /** Fondo sunken del chip. */
  bg: string;
  /** Ícono de lucide-react. */
  Icon: LucideIcon;
  /** Etiqueta por defecto. */
  label: string;
}

const STATUS_MAP: Record<StatusKind, StatusSpec> = {
  sinDatos:         { ink: wt.color.neutral,    bg: wt.color.neutralBg, Icon: CircleDashed,  label: "Sin datos" },
  detectado:        { ink: wt.color.infoInk,    bg: wt.color.infoBg,    Icon: Inbox,         label: "Detectado" },
  requiereRevision: { ink: wt.color.warningInk, bg: wt.color.warningBg, Icon: AlertTriangle, label: "Requiere revisión" },
  confirmado:       { ink: wt.color.successInk, bg: wt.color.successBg, Icon: CheckCircle2,  label: "Confirmado" },
  excluido:         { ink: wt.color.neutral,    bg: wt.color.neutralBg, Icon: MinusCircle,   label: "Excluido" },
  impacta:          { ink: wt.color.infoInk,    bg: wt.color.infoBg,    Icon: Calculator,    label: "Impacta cálculo" },
  noImpacta:        { ink: wt.color.neutral,    bg: wt.color.neutralBg, Icon: CircleSlash,   label: "No impacta" },
  enRevision:       { ink: wt.color.warningInk, bg: wt.color.warningBg, Icon: Loader,        label: "En revisión" },
  estimado:         { ink: wt.color.infoInk,    bg: wt.color.infoBg,    Icon: Sigma,         label: "Estimado" },
  listoValidar:     { ink: wt.color.successInk, bg: wt.color.successBg, Icon: ShieldCheck,   label: "Listo para validar" },
  presentado:       { ink: wt.color.successInk, bg: wt.color.successBg, Icon: BadgeCheck,    label: "Presentado" },
};

const SIZES: Record<Size, { h: number; px: number; gap: number; icon: number; text: CSSProperties }> = {
  sm: { h: 22, px: 8,  gap: 4, icon: 13, text: wt.text.caption },
  md: { h: 26, px: 10, gap: 5, icon: 14, text: wt.text.label },
};

export interface StatusChipProps extends HTMLAttributes<HTMLSpanElement> {
  status: StatusKind;
  size?: Size;
  /** Override opcional del texto del chip (el ícono se mantiene). */
  label?: string;
}

export function StatusChip({ status, size = "md", label, style, ...rest }: StatusChipProps) {
  const spec = STATUS_MAP[status];
  const s = SIZES[size];
  const { Icon } = spec;
  const text = label ?? spec.label;

  return (
    <span
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: s.gap,
        height: s.h,
        padding: `0 ${s.px}px`,
        background: spec.bg,
        color: spec.ink,
        border: "1px solid transparent",
        borderRadius: wt.radius.pill,
        fontFamily: wt.font.sans,
        ...s.text,
        lineHeight: 1,
        whiteSpace: "nowrap",
        userSelect: "none",
        ...style,
      }}
    >
      <Icon size={s.icon} strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />
      <span>{text}</span>
    </span>
  );
}
