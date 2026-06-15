/**
 * SectionHeader — Design System (Fase 2).
 *
 * Encabezado de sección dentro de una página: overline opcional + título h3 +
 * descripción, con una acción opcional a la derecha. Más compacto que PageHeader.
 * Estático (sin interacción propia): función plana, sin "use client".
 */
import { type CSSProperties, type ReactNode } from "react";
import { wt } from "@/design-system/tokens";

export interface SectionHeaderProps {
  /** Título de la sección (h3). */
  title: string;
  /** Descripción de apoyo, debajo del título. */
  description?: string;
  /** Acción a la derecha (p.ej. un botón o enlace). */
  action?: ReactNode;
  /** Etiqueta sobre el título (kicker), micro uppercase silenciado. */
  overline?: string;
  className?: string;
  style?: CSSProperties;
}

export function SectionHeader({
  title,
  description,
  action,
  overline,
  className,
  style,
}: SectionHeaderProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: wt.space[4],
        marginBottom: wt.space[5],
        ...style,
      }}
    >
      <div style={{ minWidth: 0, flex: "1 1 240px" }}>
        {overline && (
          <p
            style={{
              ...wt.text.micro,
              color: wt.color.textMuted,
              fontFamily: wt.font.sans,
              margin: 0,
              marginBottom: wt.space[2],
            }}
          >
            {overline}
          </p>
        )}

        <h3
          style={{
            ...wt.text.h3,
            color: wt.color.text,
            fontFamily: wt.font.sans,
            margin: 0,
          }}
        >
          {title}
        </h3>

        {description && (
          <p
            style={{
              ...wt.text.bodySm,
              color: wt.color.textSecondary,
              fontFamily: wt.font.sans,
              margin: 0,
              marginTop: wt.space[2],
            }}
          >
            {description}
          </p>
        )}
      </div>

      {action && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: wt.space[3],
            flexShrink: 0,
          }}
        >
          {action}
        </div>
      )}
    </div>
  );
}
