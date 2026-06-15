/**
 * SecurityNotice — Design System (Fase 2.5B · Trust & Consent).
 *
 * Aviso de seguridad breve, discreto, en una línea. Estático (sin estado).
 * Tono CALMADO: blue-gray para el ícono, texto muted. No alarma, informa.
 *
 * Ej: "Tus credenciales se cifran (AES-256) y solo tú las usas."
 */
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { wt } from "@/design-system/tokens";

export interface SecurityNoticeProps {
  /** Texto del aviso (corto, una línea). */
  children: ReactNode;
  /** Override del ícono. Default: Lock (lucide). Tamaño 14-15 recomendado. */
  icon?: ReactNode;
}

export function SecurityNotice({ children, icon }: SecurityNoticeProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: wt.space[3],
        fontFamily: wt.font.sans,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          flexShrink: 0,
          color: wt.color.trustBlueGray,
        }}
      >
        {icon ?? <Lock size={14} strokeWidth={2} aria-hidden="true" />}
      </span>
      <span style={{ ...wt.text.caption, color: wt.color.textMuted }}>
        {children}
      </span>
    </div>
  );
}
