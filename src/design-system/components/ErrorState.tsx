import type { CSSProperties } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { wt } from "@/design-system/tokens";

type Variant = "block" | "inline";

export interface ErrorStateProps {
  /** Título humano. Default: "Algo salió mal". */
  title?: string;
  /** Apoyo opcional que explica qué pasó o qué hacer. */
  description?: string;
  /** Si se pasa, muestra un botón "Reintentar". */
  onRetry?: () => void;
  /** Texto del botón de reintento. Default: "Reintentar". */
  retryLabel?: string;
  /** `block` centra; `inline` cabe en una fila compacta. */
  variant?: Variant;
}

/**
 * ErrorState — fallo RECUPERABLE (nunca "Error 500"). Ícono AlertTriangle en
 * danger sutil, texto humano y acción de reintento. Estático: el botón usa
 * solo el callback `onRetry`, sin estado interno propio.
 */
export function ErrorState({
  title = "Algo salió mal",
  description,
  onRetry,
  retryLabel = "Reintentar",
  variant = "block",
}: ErrorStateProps) {
  const retryButton = onRetry ? (
    <button
      type="button"
      onClick={onRetry}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: wt.space[3],
        height: 40,
        minHeight: 44,
        padding: `0 ${wt.space[5]}px`,
        borderRadius: wt.radius.md,
        background: wt.color.surface,
        border: `1px solid ${wt.color.border}`,
        color: wt.color.text,
        fontFamily: wt.font.sans,
        fontSize: 14,
        fontWeight: 560,
        cursor: "pointer",
        transition: `background ${wt.motion.fast} ${wt.motion.ease}`,
      }}
    >
      <RefreshCw size={16} aria-hidden="true" />
      {retryLabel}
    </button>
  ) : null;

  const iconCircle = (size: number): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: size,
    height: size,
    borderRadius: wt.radius.pill,
    background: wt.color.dangerBg,
    color: wt.color.danger,
    flexShrink: 0,
  });

  const titleStyle: CSSProperties = {
    ...wt.text.h3,
    color: wt.color.text,
    margin: 0,
  };

  const descStyle: CSSProperties = {
    ...wt.text.body,
    color: wt.color.textMuted,
    margin: 0,
  };

  if (variant === "inline") {
    return (
      <div
        role="alert"
        style={{
          display: "flex",
          alignItems: "center",
          gap: wt.space[4],
          padding: wt.space[4],
          borderRadius: wt.radius.md,
          background: wt.color.surface,
          border: `1px solid ${wt.color.border}`,
          fontFamily: wt.font.sans,
        }}
      >
        <span style={iconCircle(32)} aria-hidden="true">
          <AlertTriangle size={16} />
        </span>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: wt.space[1],
            flex: 1,
            minWidth: 0,
          }}
        >
          <span style={{ ...wt.text.label, color: wt.color.text }}>{title}</span>
          {description ? (
            <span style={{ ...wt.text.bodySm, color: wt.color.textMuted }}>
              {description}
            </span>
          ) : null}
        </div>
        {retryButton}
      </div>
    );
  }

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: wt.space[5],
        padding: wt.space[10],
        fontFamily: wt.font.sans,
      }}
    >
      <span style={iconCircle(56)} aria-hidden="true">
        <AlertTriangle size={24} />
      </span>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: wt.space[2],
          alignItems: "center",
        }}
      >
        <h3 style={titleStyle}>{title}</h3>
        {description ? (
          <p style={{ ...descStyle, maxWidth: 360 }}>{description}</p>
        ) : null}
      </div>

      {retryButton ? <div style={{ marginTop: wt.space[2] }}>{retryButton}</div> : null}
    </div>
  );
}
