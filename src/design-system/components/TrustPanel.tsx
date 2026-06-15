/**
 * TrustPanel — Design System (Fase 2.5B · Trust & Consent).
 *
 * Panel SOBRIO de confianza. Estático (sin estado). Tono blue-gray/slate, NUNCA
 * color brillante: la confianza se comunica con calma, no con énfasis visual.
 *
 * Composición: header (ícono + title + description) → children (slot, p. ej. una
 * PermissionList) → footnote separada por hairline (p. ej. un SecurityNotice).
 *
 * Ancla de marca aceptable en description:
 *   "Wedge prepara; tú validas y presentas en SAT."
 */
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { wt } from "@/design-system/tokens";

export interface TrustPanelProps {
  /** Título del panel (wt.text.h3). */
  title: string;
  /** Descripción breve bajo el título. Opcional. */
  description?: string;
  /** Ícono del header. Default: ShieldCheck (lucide), color trustBlueGray. */
  icon?: ReactNode;
  /** Contenido principal del panel (p. ej. una PermissionList). */
  children?: ReactNode;
  /** Pie separado por hairline (p. ej. un SecurityNotice). Opcional. */
  footnote?: ReactNode;
}

export function TrustPanel({
  title,
  description,
  icon,
  children,
  footnote,
}: TrustPanelProps) {
  return (
    <section
      style={{
        background: wt.color.trustPanel,
        border: "1px solid rgba(100,116,139,0.20)",
        borderRadius: wt.radius.lg,
        padding: 20,
        fontFamily: wt.font.sans,
      }}
    >
      {/* Header: ícono + (title + description) */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: wt.space[4] }}>
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            flexShrink: 0,
            marginTop: 2,
            color: wt.color.trustBlueGray,
          }}
        >
          {icon ?? <ShieldCheck size={20} strokeWidth={2} aria-hidden="true" />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ ...wt.text.h3, color: wt.color.text, margin: 0 }}>{title}</h3>
          {description != null && (
            <p
              style={{
                ...wt.text.bodySm,
                color: wt.color.trustInk,
                margin: `${wt.space[2]}px 0 0`,
              }}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Slot principal */}
      {children != null && (
        <div style={{ marginTop: wt.space[5] }}>{children}</div>
      )}

      {/* Pie con hairline */}
      {footnote != null && (
        <div
          style={{
            marginTop: wt.space[5],
            paddingTop: wt.space[4],
            borderTop: "1px solid rgba(100,116,139,0.16)",
          }}
        >
          {footnote}
        </div>
      )}
    </section>
  );
}
