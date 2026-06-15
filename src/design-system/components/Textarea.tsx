"use client";

/**
 * Textarea — Design System (Fase 2).
 *
 * Área de texto multilínea premium en dark. Mismos estados que Input
 * (hover, focus ring naranja, error, disabled). minHeight ~96, font ≥15
 * anti-zoom iOS, resize vertical.
 */
import {
  useId,
  useState,
  type TextareaHTMLAttributes,
} from "react";
import { wt } from "@/design-system/tokens";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({
  label,
  error,
  hint,
  id,
  disabled,
  style,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: TextareaProps) {
  const [focus, setFocus] = useState(false);
  const [hover, setHover] = useState(false);
  const reactId = useId();
  const areaId = id ?? reactId;
  const describedById = error
    ? `${areaId}-error`
    : hint
    ? `${areaId}-hint`
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
          htmlFor={areaId}
          style={{
            ...wt.text.label,
            fontFamily: wt.font.sans,
            color: wt.color.textSecondary,
          }}
        >
          {label}
        </label>
      )}

      <textarea
        {...rest}
        id={areaId}
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
          minHeight: 96,
          padding: "10px 14px",
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
          resize: "vertical",
          transition: `border-color ${wt.motion.base} ${wt.motion.ease}, box-shadow ${wt.motion.base} ${wt.motion.ease}`,
          ...style,
        }}
      />

      {error ? (
        <span
          id={`${areaId}-error`}
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
          id={`${areaId}-hint`}
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
