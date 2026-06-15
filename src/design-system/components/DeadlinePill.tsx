/**
 * DeadlinePill — Design System (Fase 2.5B · Progreso & Retención).
 *
 * Pill de fecha límite del Mes Fiscal (el día 17). Estático: función plana,
 * SIN "use client".
 *
 * Tono por urgencia — NUNCA rojo salvo vencido:
 *   days > 7   → calm    (neutralBg / textSecondary, ícono Calendar)
 *   days 1–7   → warning (warningBg / warningInk, ícono Clock)
 *   days === 0 → warning fuerte (warningInk de fondo, fecha de hoy)
 *   days < 0   → danger  (dangerBg / dangerInk, vencido — riesgo real)
 *
 * Copy: "Faltan N día(s) para el día 17" · "Hoy es el día 17" · "Venció el día 17".
 * El estado nunca depende solo del color: lleva ícono + texto explícito.
 */
import type { CSSProperties } from "react";
import { Calendar, Clock, AlertTriangle } from "lucide-react";
import { wt } from "@/design-system/tokens";

const ICON = 14;

export interface DeadlinePillProps {
  /** Días restantes para la fecha límite (negativo = vencido). */
  days: number;
  /** Día del mes en que vence. Default 17. */
  day?: number;
  className?: string;
  style?: CSSProperties;
}

interface Tone {
  bg: string;
  color: string;
  icon: typeof Calendar;
}

function tone(days: number): Tone {
  if (days < 0) {
    return { bg: wt.color.dangerBg, color: wt.color.dangerInk, icon: AlertTriangle };
  }
  if (days === 0) {
    // Hoy — urgencia máxima sin caer en rojo (no es riesgo fiscal aún).
    return { bg: wt.color.warningBg, color: wt.color.warning, icon: Clock };
  }
  if (days <= 7) {
    return { bg: wt.color.warningBg, color: wt.color.warningInk, icon: Clock };
  }
  return { bg: wt.color.neutralBg, color: wt.color.textSecondary, icon: Calendar };
}

function label(days: number, day: number): string {
  if (days < 0) return `Venció el día ${day}`;
  if (days === 0) return `Hoy es el día ${day}`;
  if (days === 1) return `Falta 1 día para el día ${day}`;
  return `Faltan ${days} días para el día ${day}`;
}

export function DeadlinePill({ days, day = 17, className, style }: DeadlinePillProps) {
  const t = tone(days);
  const Icon = t.icon;
  const text = label(days, day);

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: wt.space[3],
        height: 28,
        padding: `0 ${wt.space[4]}px`,
        borderRadius: wt.radius.pill,
        background: t.bg,
        color: t.color,
        ...wt.text.label,
        fontFamily: wt.font.sans,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <Icon size={ICON} strokeWidth={2.25} aria-hidden style={{ flexShrink: 0 }} />
      {text}
    </span>
  );
}
