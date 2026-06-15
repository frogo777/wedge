/**
 * PermissionList — Design System (Fase 2.5B · Trust & Consent).
 *
 * Lista de permisos: qué SÍ puede hacer Wedge / qué NO. Estático (sin estado).
 *
 * Conductual: el "no puede" es INFORMATIVO, no alarmante. Por eso el denegado
 * usa textMuted (gris), nunca danger. Saber qué NO hace Wedge genera confianza.
 *
 * Ej allowed:  "Wedge puede leer tus CFDIs emitidos y recibidos"
 * Ej denied:   "Wedge no declara, no paga ni modifica nada en el SAT"
 */
import { Check, Minus } from "lucide-react";
import { wt } from "@/design-system/tokens";

export interface PermissionItem {
  /** true = Wedge SÍ puede (Check verde). false = NO puede (Minus gris, informativo). */
  allowed: boolean;
  /** Descripción del permiso, copy fiscal real. */
  label: string;
}

export interface PermissionListProps {
  items: PermissionItem[];
}

export function PermissionList({ items }: PermissionListProps) {
  return (
    <ul
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: wt.space[3],
        fontFamily: wt.font.sans,
      }}
    >
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: wt.space[3],
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              flexShrink: 0,
              marginTop: 1,
              color: item.allowed ? wt.color.success : wt.color.textMuted,
            }}
          >
            {item.allowed ? (
              <Check size={16} strokeWidth={2.25} aria-hidden="true" />
            ) : (
              <Minus size={16} strokeWidth={2.25} aria-hidden="true" />
            )}
          </span>
          <span
            style={{
              ...wt.text.bodySm,
              color: item.allowed ? wt.color.text : wt.color.textSecondary,
            }}
          >
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
