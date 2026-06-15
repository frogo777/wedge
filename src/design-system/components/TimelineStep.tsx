/**
 * TimelineStep — Design System (Fase 2).
 *
 * Paso del ciclo "Mes Fiscal". Estático (sin interacción).
 * Render: columna nodo (círculo) + línea conectora vertical · contenido (título + descripción).
 *
 * Estados:
 *   done     → success + CheckCircle2 (esto está listo)
 *   current  → orange + anillo (esto sigue, foco activo)
 *   upcoming → border + textMuted (esto falta / pendiente)
 *   blocked  → danger sutil + AlertTriangle (requiere revisión)
 *
 * El estado NUNCA depende solo del color: cada nodo lleva ícono + el texto lo refuerza.
 */
import type { CSSProperties, ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Circle } from "lucide-react";
import { wt } from "@/design-system/tokens";

type State = "upcoming" | "current" | "done" | "blocked";

export interface TimelineStepProps {
  title: string;
  description?: ReactNode;
  state: State;
  /** Oculta la línea conectora inferior (usar en el último paso). */
  last?: boolean;
  /** Ícono custom dentro del nodo (sustituye al default por estado). */
  icon?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const NODE = 26; // diámetro del nodo (círculo)
const ICON = 15;

interface NodeStyle {
  bg: string;
  border: string;
  fg: string;
  ring: boolean;
  defaultIcon: ReactNode;
}

function nodeStyle(state: State): NodeStyle {
  switch (state) {
    case "done":
      return {
        bg: wt.color.successBg,
        border: wt.color.success,
        fg: wt.color.success,
        ring: false,
        defaultIcon: <CheckCircle2 size={ICON} strokeWidth={2.25} />,
      };
    case "current":
      return {
        bg: wt.color.orangeMuted,
        border: wt.color.orange,
        fg: wt.color.orange,
        ring: true,
        defaultIcon: <Circle size={9} fill="currentColor" strokeWidth={0} />,
      };
    case "blocked":
      return {
        bg: wt.color.dangerBg,
        border: wt.color.danger,
        fg: wt.color.danger,
        ring: false,
        defaultIcon: <AlertTriangle size={ICON} strokeWidth={2.25} />,
      };
    case "upcoming":
    default:
      return {
        bg: wt.color.surface,
        border: wt.color.border,
        fg: wt.color.textMuted,
        ring: false,
        defaultIcon: <Circle size={8} strokeWidth={2} />,
      };
  }
}

export function TimelineStep({
  title,
  description,
  state,
  last = false,
  icon,
  className,
  style,
}: TimelineStepProps) {
  const n = nodeStyle(state);
  const isDone = state === "done";
  // La línea conectora hereda el color del estado para señalar el progreso recorrido.
  const lineColor = isDone ? wt.color.success : wt.color.border;
  const titleColor =
    state === "upcoming" ? wt.color.textSecondary : wt.color.text;

  return (
    <div
      className={className}
      style={{
        display: "flex",
        gap: wt.space[4],
        ...style,
      }}
    >
      {/* Columna del nodo + conector */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
          alignSelf: "stretch",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: NODE,
            height: NODE,
            borderRadius: wt.radius.pill,
            background: n.bg,
            border: `1.5px solid ${n.border}`,
            color: n.fg,
            boxShadow: n.ring ? wt.shadow.focus : "none",
            flexShrink: 0,
          }}
        >
          {icon ?? n.defaultIcon}
        </span>
        {!last && (
          <span
            aria-hidden
            style={{
              flex: 1,
              width: 2,
              minHeight: wt.space[5],
              marginTop: wt.space[2],
              borderRadius: wt.radius.pill,
              background: lineColor,
            }}
          />
        )}
      </div>

      {/* Contenido */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: wt.space[2],
          paddingBottom: last ? 0 : wt.space[6],
          minWidth: 0,
        }}
      >
        <span
          style={{
            ...wt.text.label,
            fontFamily: wt.font.sans,
            color: titleColor,
          }}
        >
          {title}
        </span>
        {description && (
          <span
            style={{
              ...wt.text.bodySm,
              fontFamily: wt.font.sans,
              color: wt.color.textMuted,
            }}
          >
            {description}
          </span>
        )}
      </div>
    </div>
  );
}
