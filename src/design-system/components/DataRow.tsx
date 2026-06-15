"use client";

/**
 * DataRow — Design System (Fase 2).
 *
 * Fila de dato fiscal: CFDI, ingreso, monto. Con aire (no tabla densa).
 * Estructura: [leading] · label + meta · [status] · value (mono, derecha) · [trailing]
 * Montos a la derecha con tabular-nums. Border-bottom sutil para separar filas.
 *
 * Estática por defecto; `interactive`/`onClick` → hover surface2 + cursor pointer.
 */
import { useState, type CSSProperties, type ReactNode, type KeyboardEvent, type MouseEvent } from "react";
import { wt } from "@/design-system/tokens";

export interface DataRowProps {
  /** Emisor, concepto, etiqueta principal. string o ReactNode. */
  label: ReactNode;
  /** Monto u valor principal — render en mono + tabular-nums, alineado a la derecha. */
  value?: string | number;
  /** Metadato secundario (fecha, RFC, folio) — textMuted en mono. */
  meta?: string;
  /** Estado visual (p.ej. <StatusChip />). Se ubica antes del valor. */
  status?: ReactNode;
  /** Ícono o avatar a la izquierda. */
  leading?: ReactNode;
  /** Acción a la derecha del todo (botón icónico, chevron). */
  trailing?: ReactNode;
  /** Activa feedback de hover (surface2). Implícito si hay onClick. */
  interactive?: boolean;
  /** Marca la fila como seleccionada (fondo + borde de acento sutil). */
  selected?: boolean;
  /** Oculta el border-bottom (útil para la última fila). */
  last?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

export function DataRow({
  label,
  value,
  meta,
  status,
  leading,
  trailing,
  interactive,
  selected = false,
  last = false,
  onClick,
  className,
  style,
  ariaLabel,
}: DataRowProps) {
  const [hover, setHover] = useState(false);
  const isInteractive = interactive || !!onClick;
  const hovered = isInteractive && hover;

  const background = selected
    ? wt.color.orangeMuted
    : hovered
      ? wt.color.surface2
      : "transparent";

  const handleKeyDown = onClick
    ? (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(e as unknown as MouseEvent<HTMLDivElement>);
        }
      }
    : undefined;

  return (
    <div
      className={className}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      aria-current={selected || undefined}
      onMouseEnter={() => isInteractive && setHover(true)}
      onMouseLeave={() => isInteractive && setHover(false)}
      onKeyDown={handleKeyDown}
      style={{
        display: "flex",
        alignItems: "center",
        gap: wt.space[4],
        minHeight: 44,
        padding: `${wt.space[4]}px ${wt.space[4]}px`,
        background,
        borderBottom: last ? "none" : `1px solid ${wt.color.border}`,
        boxShadow: selected ? `inset 2px 0 0 ${wt.color.orange}` : "none",
        cursor: onClick ? "pointer" : "default",
        transition: `background ${wt.motion.fast} ${wt.motion.ease}, box-shadow ${wt.motion.fast} ${wt.motion.ease}`,
        ...style,
      }}
    >
      {leading && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: wt.color.textMuted,
          }}
        >
          {leading}
        </span>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <span
          style={{
            ...wt.text.body,
            fontFamily: wt.font.sans,
            color: wt.color.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        {meta && (
          <span
            style={{
              ...wt.text.caption,
              fontFamily: wt.font.mono,
              fontVariantNumeric: "tabular-nums",
              color: wt.color.textMuted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {meta}
          </span>
        )}
      </div>

      {status && <span style={{ display: "inline-flex", flexShrink: 0 }}>{status}</span>}

      {value !== undefined && (
        <span
          style={{
            ...wt.data.md,
            fontFamily: wt.font.mono,
            color: wt.color.text,
            textAlign: "right",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </span>
      )}

      {trailing && (
        <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
          {trailing}
        </span>
      )}
    </div>
  );
}
