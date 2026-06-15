/**
 * StepChecklist — Design System (Fase 2.5B · Progreso & Retención).
 *
 * Checklist de pasos del Mes Fiscal, estilo lista de tareas. SIN línea conectora
 * (eso lo hace TimelineStep) — aquí cada fila es independiente. Estático: función
 * plana, SIN "use client".
 *
 * Estados (nunca solo por color: ícono + tratamiento de texto):
 *   done    → CheckCircle2 (success) + label atenuado con tachado sutil.
 *   current → dot relleno (orange) + label enfatizado (text, fontWeight 560).
 *   todo    → Circle vacío (border) + label textSecondary.
 *
 * Deriva "Faltan N acciones" cuando hay pasos no resueltos — el pequeño empujón
 * que muestra cuánto queda sin abrumar.
 */
import type { CSSProperties } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { wt } from "@/design-system/tokens";

const ICON = 18;

export type StepState = "done" | "current" | "todo";

export interface ChecklistStep {
  label: string;
  state: StepState;
}

export interface StepChecklistProps {
  steps: ChecklistStep[];
  /** Título opcional encima de la lista. */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span aria-hidden style={{ display: "inline-flex", color: wt.color.success, flexShrink: 0 }}>
        <CheckCircle2 size={ICON} strokeWidth={2.25} />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: ICON,
          height: ICON,
          flexShrink: 0,
          color: wt.color.orange,
        }}
      >
        <Circle size={11} fill="currentColor" strokeWidth={0} />
      </span>
    );
  }
  return (
    <span aria-hidden style={{ display: "inline-flex", color: wt.color.border, flexShrink: 0 }}>
      <Circle size={ICON} strokeWidth={2} />
    </span>
  );
}

function labelStyle(state: StepState): CSSProperties {
  switch (state) {
    case "done":
      return {
        ...wt.text.body,
        color: wt.color.textMuted,
        textDecoration: "line-through",
        textDecorationColor: wt.color.border,
      };
    case "current":
      return { ...wt.text.body, color: wt.color.text, fontWeight: 560 };
    case "todo":
    default:
      return { ...wt.text.body, color: wt.color.textSecondary };
  }
}

export function StepChecklist({ steps, title, className, style }: StepChecklistProps) {
  const remaining = steps.filter((s) => s.state !== "done").length;

  return (
    <div className={className} style={{ width: "100%", ...style }}>
      {title && (
        <p
          style={{
            ...wt.text.label,
            fontFamily: wt.font.sans,
            color: wt.color.textSecondary,
            margin: 0,
            marginBottom: wt.space[4],
          }}
        >
          {title}
        </p>
      )}

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: wt.space[3],
        }}
      >
        {steps.map((step, i) => (
          <li
            key={`${step.label}-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: wt.space[3],
              minHeight: 24,
            }}
          >
            <StepIcon state={step.state} />
            <span style={{ ...labelStyle(step.state), fontFamily: wt.font.sans, minWidth: 0 }}>
              {step.label}
            </span>
          </li>
        ))}
      </ul>

      {remaining > 0 && (
        <p
          style={{
            ...wt.text.bodySm,
            fontFamily: wt.font.sans,
            color: wt.color.textMuted,
            margin: 0,
            marginTop: wt.space[4],
          }}
        >
          {remaining === 1 ? "Falta 1 acción" : `Faltan ${remaining} acciones`}
        </p>
      )}
    </div>
  );
}
