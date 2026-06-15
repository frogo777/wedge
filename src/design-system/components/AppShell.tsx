import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { wt } from "@/design-system/tokens";

/**
 * AppShell — shell base de la app logged-in (dark).
 *
 * Estructura limpia con slots. NO implementa navegación: el rail real y la
 * topbar de navegación se construyen en Fase 3 y se inyectan vía los slots
 * `sidebar` / `topbar`. Aquí solo hay esqueleto de layout + tema dark.
 *
 * Layout:
 *   - contenedor `.wds-root` (activa el tema dark del DS) a minHeight 100vh.
 *   - si hay `sidebar` → grid de dos columnas [rail fijo | main].
 *   - `topbar` (si existe) queda sticky en la parte superior de la columna main.
 *   - `main` con padding y `maxWidth` centrado para el contenido.
 */
export interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  /** Slot del rail lateral (p.ej. nav futura — Fase 3). Si se omite, layout de 1 columna. */
  sidebar?: ReactNode;
  /** Slot de la barra superior (sticky). La nav real va en Fase 3. */
  topbar?: ReactNode;
  /** Contenido principal de la pantalla. */
  children: ReactNode;
  /** Ancho máximo del contenido centrado en `main`. */
  maxWidth?: number;
}

/** Ancho del rail lateral cuando se provee `sidebar` (placeholder de Fase 3). */
const RAIL_WIDTH = 256;

export function AppShell({
  sidebar,
  topbar,
  children,
  maxWidth = wt.maxWidth.app,
  style,
  className,
  ...rest
}: AppShellProps) {
  const rootStyle: CSSProperties = {
    minHeight: "100vh",
    background: wt.color.bgPrimary,
    color: wt.color.text,
    fontFamily: wt.font.sans,
    // grid [rail | main] cuando hay sidebar; 1 columna si no.
    display: "grid",
    gridTemplateColumns: sidebar ? `${RAIL_WIDTH}px minmax(0, 1fr)` : "minmax(0, 1fr)",
    ...style,
  };

  const railStyle: CSSProperties = {
    // Rail estructural: la nav real (links, logo, etc.) llega en Fase 3 como children del slot.
    position: "sticky",
    top: 0,
    alignSelf: "start",
    height: "100vh",
    overflowY: "auto",
    background: wt.color.bgSecondary,
    borderRight: `1px solid ${wt.color.border}`,
  };

  const topbarStyle: CSSProperties = {
    // Topbar sticky: slot estructural. Contenido de navegación → Fase 3.
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: wt.color.bgPrimary,
    borderBottom: `1px solid ${wt.color.border}`,
  };

  const mainInnerStyle: CSSProperties = {
    width: "100%",
    maxWidth,
    margin: "0 auto",
    padding: `${wt.space[8]}px ${wt.space[6]}px`,
  };

  return (
    <div className={className ? `wds-root ${className}` : "wds-root"} style={rootStyle} {...rest}>
      {sidebar ? <aside style={railStyle}>{sidebar}</aside> : null}

      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        {topbar ? <header style={topbarStyle}>{topbar}</header> : null}
        <main style={{ flex: 1, minWidth: 0 }}>
          <div style={mainInnerStyle}>{children}</div>
        </main>
      </div>
    </div>
  );
}
