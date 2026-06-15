/**
 * PageHeader — Design System (Fase 2).
 *
 * Encabezado de página: overline opcional + título h1 (único) + descripción,
 * con zona de acciones a la derecha y enlace "atrás" opcional arriba.
 * Estático (sin interacción propia): función plana, sin "use client".
 * Aire generoso abajo para separar el header del contenido de la página.
 */
import { type CSSProperties, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { wt } from "@/design-system/tokens";

/** Enlace "atrás": botón (onClick) o ancla (href). `label` es accesible y visible. */
export interface PageHeaderBack {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface PageHeaderProps {
  /** Título principal — único h1 de la página. */
  title: string;
  /** Descripción de apoyo, debajo del título. */
  description?: string;
  /** Acciones a la derecha (p.ej. botones). */
  actions?: ReactNode;
  /** Enlace para volver atrás, encima del título. */
  back?: PageHeaderBack;
  /** Etiqueta sobre el título (kicker). Naranja por defecto, o textMuted. */
  overline?: string;
  /** Tono del overline: acento naranja (default) o silenciado. */
  overlineTone?: "orange" | "muted";
  className?: string;
  style?: CSSProperties;
}

const backStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: wt.space[2],
  marginBottom: wt.space[4],
  padding: `${wt.space[2]}px ${wt.space[3]}px`,
  marginLeft: -wt.space[3],
  background: "transparent",
  border: "none",
  borderRadius: wt.radius.md,
  color: wt.color.textMuted,
  fontFamily: wt.font.sans,
  ...wt.text.label,
  cursor: "pointer",
  textDecoration: "none",
};

function BackLink({ back }: { back: PageHeaderBack }) {
  const content = (
    <>
      <ArrowLeft size={16} aria-hidden style={{ flexShrink: 0 }} />
      <span>{back.label}</span>
    </>
  );

  if (back.href) {
    return (
      <a href={back.href} aria-label={back.label} style={backStyle}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={back.onClick} aria-label={back.label} style={backStyle}>
      {content}
    </button>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
  overline,
  overlineTone = "orange",
  className,
  style,
}: PageHeaderProps) {
  return (
    <header
      className={className}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: wt.space[5],
        paddingBottom: wt.space[7],
        marginBottom: wt.space[7],
        borderBottom: `1px solid ${wt.color.border}`,
        ...style,
      }}
    >
      <div style={{ minWidth: 0, flex: "1 1 280px" }}>
        {back && <BackLink back={back} />}

        {overline && (
          <p
            style={{
              ...wt.text.micro,
              color: overlineTone === "orange" ? wt.color.orangeInk : wt.color.textMuted,
              fontFamily: wt.font.sans,
              margin: 0,
              marginBottom: wt.space[3],
            }}
          >
            {overline}
          </p>
        )}

        <h1
          style={{
            ...wt.text.h1,
            color: wt.color.text,
            fontFamily: wt.font.sans,
            margin: 0,
          }}
        >
          {title}
        </h1>

        {description && (
          <p
            style={{
              ...wt.text.bodyLg,
              color: wt.color.textSecondary,
              fontFamily: wt.font.sans,
              margin: 0,
              marginTop: wt.space[3],
              maxWidth: wt.maxWidth.reading,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: wt.space[3],
            flexShrink: 0,
          }}
        >
          {actions}
        </div>
      )}
    </header>
  );
}
