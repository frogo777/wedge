import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { wt } from "@/design-system/tokens";

/**
 * PublicShell — shell base de páginas públicas (dark; Wedge va hacia dark).
 *
 * Estructura limpia con slots. NO implementa navegación ni CTAs finales: el
 * logo, los links y el CTA reales se construyen en Fase 3 y se inyectan vía
 * los slots `header` / `footer`. Aquí solo hay esqueleto de layout + tema dark.
 *
 * Layout:
 *   - contenedor `.wds-root` (activa el tema dark del DS) a minHeight 100vh.
 *   - `header` (si existe) sticky, translúcido sutil (bg con alpha + borderBottom).
 *   - `main` centrado con `maxWidth` para lectura.
 *   - `footer` (si existe) al final.
 */
export interface PublicShellProps extends HTMLAttributes<HTMLDivElement> {
  /** Slot del header (logo + nav futura — Fase 3). Sticky translúcido. */
  header?: ReactNode;
  /** Slot del footer (links + legal futuros — Fase 3). */
  footer?: ReactNode;
  /** Contenido principal de la página. */
  children: ReactNode;
  /** Ancho máximo del contenido centrado en `main` y en `header`/`footer`. */
  maxWidth?: number;
}

export function PublicShell({
  header,
  footer,
  children,
  maxWidth = wt.maxWidth.reading,
  style,
  className,
  ...rest
}: PublicShellProps) {
  const rootStyle: CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: wt.color.bgPrimary,
    color: wt.color.text,
    fontFamily: wt.font.sans,
    ...style,
  };

  const headerStyle: CSSProperties = {
    // Header sticky translúcido: blur + alpha sobre el grafito de fondo (#0C1017).
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "rgba(12,16,23,0.72)",
    backdropFilter: "saturate(140%) blur(12px)",
    WebkitBackdropFilter: "saturate(140%) blur(12px)",
    borderBottom: `1px solid ${wt.color.border}`,
  };

  const footerStyle: CSSProperties = {
    borderTop: `1px solid ${wt.color.border}`,
    background: wt.color.bgSecondary,
  };

  // Inner centrado compartido por header / main / footer para alinear el contenido.
  const inner = (extra?: CSSProperties): CSSProperties => ({
    width: "100%",
    maxWidth,
    margin: "0 auto",
    padding: `0 ${wt.space[6]}px`,
    ...extra,
  });

  return (
    <div className={className ? `wds-root ${className}` : "wds-root"} style={rootStyle} {...rest}>
      {header ? (
        <header style={headerStyle}>
          <div style={inner({ paddingTop: wt.space[4], paddingBottom: wt.space[4] })}>{header}</div>
        </header>
      ) : null}

      <main style={{ flex: 1, minWidth: 0 }}>
        <div style={inner({ paddingTop: wt.space[9], paddingBottom: wt.space[9] })}>{children}</div>
      </main>

      {footer ? (
        <footer style={footerStyle}>
          <div style={inner({ paddingTop: wt.space[7], paddingBottom: wt.space[7] })}>{footer}</div>
        </footer>
      ) : null}
    </div>
  );
}
