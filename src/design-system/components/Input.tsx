"use client";

/**
 * Input — Design System (Fase 2).
 *
 * Text input premium en dark, claro en mobile (height ≥40, font ≥15 anti-zoom iOS).
 * Estados: default, hover, focus (ring naranja), error, disabled.
 * Patrón común de la familia de forms: label arriba, control, hint/error abajo.
 */
import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { wt } from "@/design-system/tokens";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  id,
  disabled,
  style,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: InputProps) {
  const [focus, setFocus] = useState(false);
  const [hover, setHover] = useState(false);
  const reactId = useId();
  const inputId = id ?? reactId;
  const describedById = error
    ? `${inputId}-error`
    : hint
    ? `${inputId}-hint`
    : undefined;

  const borderColor = error
    ? wt.color.danger
    : focus
    ? wt.color.borderFocus
    : hover
    ? wt.color.borderStrong
    : wt.color.border;

  const ring = focus
    ? error
      ? "0 0 0 3px rgba(241,90,80,0.25)"
      : wt.shadow.focus
    : "none";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: wt.space[3],
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label && (
        <label
          htmlFor={inputId}
          style={{
            ...wt.text.label,
            fontFamily: wt.font.sans,
            color: wt.color.textSecondary,
          }}
        >
          {label}
        </label>
      )}

      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {leftIcon && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 12,
              display: "inline-flex",
              alignItems: "center",
              color: focus ? wt.color.textSecondary : wt.color.textMuted,
              pointerEvents: "none",
              transition: `color ${wt.motion.base} ${wt.motion.ease}`,
            }}
          >
            {leftIcon}
          </span>
        )}
        <input
          {...rest}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedById}
          onFocus={(e) => {
            setFocus(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            onBlur?.(e);
          }}
          onMouseEnter={(e) => {
            setHover(true);
            onMouseEnter?.(e);
          }}
          onMouseLeave={(e) => {
            setHover(false);
            onMouseLeave?.(e);
          }}
          style={{
            width: "100%",
            height: 44,
            paddingTop: 0,
            paddingBottom: 0,
            paddingLeft: leftIcon ? 38 : 14,
            paddingRight: 14,
            fontFamily: wt.font.sans,
            fontSize: 15,
            lineHeight: "22px",
            color: wt.color.text,
            background: wt.color.surface,
            border: `1px solid ${borderColor}`,
            borderRadius: wt.radius.md,
            outline: "none",
            boxShadow: ring,
            cursor: disabled ? "not-allowed" : "text",
            transition: `border-color ${wt.motion.base} ${wt.motion.ease}, box-shadow ${wt.motion.base} ${wt.motion.ease}`,
            ...style,
          }}
        />
      </div>

      {error ? (
        <span
          id={`${inputId}-error`}
          style={{
            ...wt.text.caption,
            fontFamily: wt.font.sans,
            color: wt.color.danger,
          }}
        >
          {error}
        </span>
      ) : hint ? (
        <span
          id={`${inputId}-hint`}
          style={{
            ...wt.text.caption,
            fontFamily: wt.font.sans,
            color: wt.color.textMuted,
          }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}
