import type { CSSProperties, ReactNode } from "react";
import { wt } from "@/design-system/tokens";

type Variant = "default" | "compact";

export interface EmptyStateProps {
  /** Ícono opcional (p.ej. <Inbox size={22} />). Va dentro de un círculo sutil. */
  icon?: ReactNode;
  /** Título principal — debe ser claro y, idealmente, accionable. */
  title: string;
  /** Línea de apoyo que explica el siguiente paso. */
  description?: string;
  /** CTA opcional — normalmente un <Button>. */
  action?: ReactNode;
  /** `compact` reduce paddings e ícono para usar dentro de tarjetas o paneles. */
  variant?: Variant;
}

const SIZES = {
  default: { pad: wt.space[10], gap: wt.space[5], maxW: 380 },
  compact: { pad: wt.space[7], gap: wt.space[4], maxW: 320 },
} as const;

/**
 * EmptyState — vacío ACCIONABLE (nunca un simple "No hay datos").
 * Estático (sin interacción propia). Centrado: ícono en círculo, título, apoyo y CTA.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
}: EmptyStateProps) {
  const s = SIZES[variant];

  const root: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: s.gap,
    padding: s.pad,
    fontFamily: wt.font.sans,
  };

  // Ícono plano y sobrio (sin círculo con borde — evita el look "sticker" genérico).
  const iconWrap: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: wt.color.textMuted,
    opacity: 0.85,
    flexShrink: 0,
  };

  const titleStyle: CSSProperties = {
    ...wt.text.h3,
    color: wt.color.text,
    margin: 0,
  };

  const descStyle: CSSProperties = {
    ...wt.text.body,
    color: wt.color.textMuted,
    margin: 0,
    maxWidth: s.maxW,
  };

  return (
    <div style={root}>
      {icon ? (
        <span style={iconWrap} aria-hidden="true">
          {icon}
        </span>
      ) : null}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: wt.space[2],
          alignItems: "center",
        }}
      >
        <h3 style={titleStyle}>{title}</h3>
        {description ? <p style={descStyle}>{description}</p> : null}
      </div>

      {action ? <div style={{ marginTop: wt.space[2] }}>{action}</div> : null}
    </div>
  );
}
