"use client";

/**
 * ConsentPanel — Design System (Fase 2.5B · Trust & Consent).
 *
 * Consentimiento ANTES de conectar SAT / e.firma. "use client" por el hover del CTA.
 *
 * Conductual: el usuario debe sentir CONTROL y entender qué pasa. NUNCA coercitivo.
 *   - PermissionList deja claro qué SÍ / qué NO hace Wedge.
 *   - La línea "Puedes usar Wedge sin conectar SAT" + alternativa manual (ghost)
 *     recuerda que conectar es opcional.
 *   - El CTA naranja es la acción, pero convive con la salida manual sin presión.
 *   - SecurityNotice al pie cierra con calma.
 *
 * Compone PermissionList y SecurityNotice (únicos imports internos permitidos).
 */
import { useState } from "react";
import { wt } from "@/design-system/tokens";
import { PermissionList, type PermissionItem } from "./PermissionList";
import { SecurityNotice } from "./SecurityNotice";

export interface ConsentAction {
  label: string;
  onClick: () => void;
}

export interface ConsentPanelProps {
  /** Título. Default: "Antes de conectar tu SAT". */
  title?: string;
  /** Descripción breve bajo el título. Opcional. */
  description?: string;
  /** Permisos qué SÍ / qué NO (renderiza una PermissionList). */
  permissions: PermissionItem[];
  /** Alternativa manual ghost, p. ej. "Empezar con XML/ZIP". Opcional. */
  manualAlt?: ConsentAction;
  /** CTA primary (naranja), p. ej. "Conectar mi SAT". Opcional. */
  onConsent?: ConsentAction;
  /** Texto del SecurityNotice al pie. Opcional. */
  securityNote?: string;
}

export function ConsentPanel({
  title = "Antes de conectar tu SAT",
  description,
  permissions,
  manualAlt,
  onConsent,
  securityNote,
}: ConsentPanelProps) {
  const [ctaHover, setCtaHover] = useState(false);
  const [ctaActive, setCtaActive] = useState(false);
  const [altHover, setAltHover] = useState(false);

  return (
    <section
      style={{
        background: wt.color.surface,
        border: `1px solid ${wt.color.border}`,
        borderRadius: wt.radius.lg,
        padding: 24,
        fontFamily: wt.font.sans,
        display: "flex",
        flexDirection: "column",
        gap: wt.space[5],
      }}
    >
      {/* Encabezado */}
      <div>
        <h2 style={{ ...wt.text.h2, color: wt.color.text, margin: 0 }}>{title}</h2>
        {description != null && (
          <p
            style={{
              ...wt.text.body,
              color: wt.color.textSecondary,
              margin: `${wt.space[3]}px 0 0`,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {/* Qué sí / qué no */}
      <PermissionList items={permissions} />

      {/* Recordatorio de control + alternativa manual */}
      {manualAlt && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: wt.space[3],
            paddingTop: wt.space[4],
            borderTop: `1px solid ${wt.color.border}`,
          }}
        >
          <span style={{ ...wt.text.bodySm, color: wt.color.textMuted }}>
            Puedes usar Wedge sin conectar SAT.
          </span>
          <button
            type="button"
            onClick={manualAlt.onClick}
            onMouseEnter={() => setAltHover(true)}
            onMouseLeave={() => setAltHover(false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 40,
              padding: `0 ${wt.space[4]}px`,
              fontFamily: wt.font.sans,
              fontSize: 14,
              fontWeight: 560,
              lineHeight: 1,
              color: altHover ? wt.color.text : wt.color.textSecondary,
              background: altHover ? wt.color.surface2 : "transparent",
              border: "1px solid transparent",
              borderRadius: wt.radius.md,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: `background ${wt.motion.base} ${wt.motion.ease}, color ${wt.motion.base} ${wt.motion.ease}`,
            }}
          >
            {manualAlt.label}
          </button>
        </div>
      )}

      {/* CTA primary (naranja) */}
      {onConsent && (
        <button
          type="button"
          onClick={onConsent.onClick}
          onMouseEnter={() => setCtaHover(true)}
          onMouseLeave={() => {
            setCtaHover(false);
            setCtaActive(false);
          }}
          onMouseDown={() => setCtaActive(true)}
          onMouseUp={() => setCtaActive(false)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "flex-start",
            height: 40,
            padding: `0 ${wt.space[5]}px`,
            fontFamily: wt.font.sans,
            fontSize: 14,
            fontWeight: 560,
            lineHeight: 1,
            color: wt.color.textInverse,
            background: ctaActive
              ? wt.color.orangePressed
              : ctaHover
                ? wt.color.orangeHover
                : wt.color.orange,
            border: "1px solid transparent",
            borderRadius: wt.radius.md,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transform: ctaActive ? "scale(0.98)" : "scale(1)",
            transition: `background ${wt.motion.base} ${wt.motion.ease}, transform ${wt.motion.fast} ${wt.motion.ease}`,
          }}
        >
          {onConsent.label}
        </button>
      )}

      {/* Aviso de seguridad al pie */}
      {securityNote != null && (
        <SecurityNotice>{securityNote}</SecurityNotice>
      )}
    </section>
  );
}
