"use client";

/**
 * ReviewItem — Design System (Fase 2.5B).
 *
 * Patrón de PROGRESSIVE DISCLOSURE para revisar un CFDI o decisión fiscal.
 * No vuelca todo de golpe: revela en capas, en el orden en que la mente las necesita.
 *
 *   ESTADO          → ¿qué es esto? (chip ícono+texto, aceptado por prop)
 *   IMPACTO         → ¿qué le hace a mi mes? (una línea humana)
 *   SIGUIENTE ACCIÓN→ ¿qué hago? (acción clara y específica)
 *   (expandible) DESGLOSE → el "porqué": CFDIs fuente, criterio, explicación
 *
 * El desglose vive detrás de "Ver detalle" — disponible para quien lo necesita,
 * fuera del camino de quien solo quiere confirmar. Calma sobre densidad.
 */
import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { wt } from "@/design-system/tokens";

export interface ReviewItemAction {
  label: string;
  onClick: () => void;
}

export interface ReviewItemProps {
  /** Identidad de la fila — p.ej. "Cliente Acme S.A. de C.V. · $24,360". */
  title: string;
  /** Metadato sobrio en mono: fecha / RFC / forma de pago. */
  meta?: string;
  /** StatusChip aceptado por prop (NO se importa StatusChip aquí). */
  status?: ReactNode;
  /** Efecto fiscal en lenguaje humano — p.ej. "Suma $24,360 a tus ingresos de mayo". */
  impact?: string;
  /** Contenido expandible: desglose, CFDIs fuente, criterio o explicación. */
  detail?: ReactNode;
  /** Acción primaria (naranja) — p.ej. "Confirmar". */
  primaryAction?: ReviewItemAction;
  /** Acción secundaria sutil — p.ej. "Excluir". */
  secondaryAction?: ReviewItemAction;
  defaultExpanded?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function ReviewItem({
  title,
  meta,
  status,
  impact,
  detail,
  primaryAction,
  secondaryAction,
  defaultExpanded = false,
  className,
  style,
}: ReviewItemProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [primaryHover, setPrimaryHover] = useState(false);
  const [primaryActive, setPrimaryActive] = useState(false);
  const [secondaryHover, setSecondaryHover] = useState(false);
  const [discloseHover, setDiscloseHover] = useState(false);

  const detailId = useId();
  const hasActions = !!primaryAction || !!secondaryAction;

  return (
    <div
      className={className}
      style={{
        background: wt.color.surface,
        border: `1px solid ${wt.color.border}`,
        borderRadius: wt.radius.lg,
        padding: `${wt.space[5]}px ${wt.space[6]}px`,
        ...style,
      }}
    >
      {/* ── Fila colapsada: izquierda (identidad) · derecha (estado + acciones) ── */}
      <div
        style={{
          display: "flex",
          gap: wt.space[5],
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        {/* Izquierda: title → meta → impact */}
        <div style={{ display: "flex", flexDirection: "column", gap: wt.space[2], flex: 1, minWidth: 200 }}>
          <span style={{ ...wt.text.h3, color: wt.color.text }}>{title}</span>

          {meta ? (
            <span
              style={{
                ...wt.text.caption,
                fontFamily: wt.font.mono,
                color: wt.color.textMuted,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {meta}
            </span>
          ) : null}

          {impact ? (
            <span style={{ ...wt.text.bodySm, color: wt.color.textSecondary }}>{impact}</span>
          ) : null}
        </div>

        {/* Derecha: estado (arriba) · acciones (abajo) */}
        {(status || hasActions) ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: wt.space[4],
              flexShrink: 0,
            }}
          >
            {status ? <span style={{ display: "inline-flex" }}>{status}</span> : null}

            {hasActions ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: wt.space[3] }}>
                {secondaryAction ? (
                  <button
                    type="button"
                    onClick={secondaryAction.onClick}
                    onMouseEnter={() => setSecondaryHover(true)}
                    onMouseLeave={() => setSecondaryHover(false)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 40,
                      padding: `0 ${wt.space[4]}px`,
                      background: secondaryHover ? wt.color.surface2 : "transparent",
                      color: wt.color.textSecondary,
                      border: "1px solid transparent",
                      borderRadius: wt.radius.md,
                      fontFamily: wt.font.sans,
                      fontSize: 14,
                      fontWeight: 540,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: `background ${wt.motion.base} ${wt.motion.ease}`,
                    }}
                  >
                    {secondaryAction.label}
                  </button>
                ) : null}

                {primaryAction ? (
                  <button
                    type="button"
                    onClick={primaryAction.onClick}
                    onMouseEnter={() => setPrimaryHover(true)}
                    onMouseLeave={() => { setPrimaryHover(false); setPrimaryActive(false); }}
                    onMouseDown={() => setPrimaryActive(true)}
                    onMouseUp={() => setPrimaryActive(false)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 40,
                      padding: `0 ${wt.space[5]}px`,
                      background: primaryActive
                        ? wt.color.orangePressed
                        : primaryHover
                          ? wt.color.orangeHover
                          : wt.color.orange,
                      color: wt.color.textInverse,
                      border: "1px solid transparent",
                      borderRadius: wt.radius.md,
                      fontFamily: wt.font.sans,
                      fontSize: 14,
                      fontWeight: 560,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transform: primaryActive ? "scale(0.98)" : "scale(1)",
                      transition: `background ${wt.motion.fast} ${wt.motion.ease}, transform ${wt.motion.fast} ${wt.motion.ease}`,
                    }}
                  >
                    {primaryAction.label}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ── Disclosure: "Ver detalle" con chevron que rota al expandir ── */}
      {detail ? (
        <>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailId}
            onClick={() => setExpanded((v) => !v)}
            onMouseEnter={() => setDiscloseHover(true)}
            onMouseLeave={() => setDiscloseHover(false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: wt.space[2],
              marginTop: wt.space[4],
              height: 28,
              padding: 0,
              background: "transparent",
              border: "none",
              color: discloseHover ? wt.color.textSecondary : wt.color.textMuted,
              fontFamily: wt.font.sans,
              ...wt.text.label,
              cursor: "pointer",
              transition: `color ${wt.motion.base} ${wt.motion.ease}`,
            }}
          >
            <span>{expanded ? "Ocultar detalle" : "Ver detalle"}</span>
            <ChevronDown
              size={16}
              strokeWidth={2}
              aria-hidden
              style={{
                flexShrink: 0,
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: `transform ${wt.motion.base} ${wt.motion.ease}`,
              }}
            />
          </button>

          {expanded ? (
            <div
              id={detailId}
              style={{
                marginTop: wt.space[4],
                paddingTop: wt.space[4],
                borderTop: `1px solid ${wt.color.border}`,
                ...wt.text.bodySm,
                color: wt.color.textSecondary,
              }}
            >
              {detail}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
