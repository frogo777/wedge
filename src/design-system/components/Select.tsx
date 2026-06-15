"use client";

/**
 * Select — Design System (Fase 2).
 *
 * <select> nativo estilizado dark: appearance:none + ChevronDown posicionado.
 * Acepta `options` o `children` (<option>). Mismos estados que Input
 * (hover, focus ring naranja, error, disabled). height ≥40, font ≥15 anti-zoom iOS.
 */
import {
  useId,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";
import { wt } from "@/design-system/tokens";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
  children?: ReactNode;
}

export function Select({
  label,
  error,
  hint,
  options,
  children,
  id,
  disabled,
  style,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: SelectProps) {
  const [focus, setFocus] = useState(false);
  const [hover, setHover] = useState(false);
  const reactId = useId();
  const selectId = id ?? reactId;
  const describedById = error
    ? `${selectId}-error`
    : hint
    ? `${selectId}-hint`
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
          htmlFor={selectId}
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
        <select
          {...rest}
          id={selectId}
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
            paddingLeft: 14,
            paddingRight: 38,
            fontFamily: wt.font.sans,
            fontSize: 15,
            lineHeight: "22px",
            color: wt.color.text,
            background: wt.color.surface,
            border: `1px solid ${borderColor}`,
            borderRadius: wt.radius.md,
            outline: "none",
            boxShadow: ring,
            cursor: disabled ? "not-allowed" : "pointer",
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
            transition: `border-color ${wt.motion.base} ${wt.motion.ease}, box-shadow ${wt.motion.base} ${wt.motion.ease}`,
            ...style,
          }}
        >
          {options
            ? options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown
          size={18}
          aria-hidden
          style={{
            position: "absolute",
            right: 12,
            color: focus ? wt.color.textSecondary : wt.color.textMuted,
            pointerEvents: "none",
            transition: `color ${wt.motion.base} ${wt.motion.ease}`,
          }}
        />
      </div>

      {error ? (
        <span
          id={`${selectId}-error`}
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
          id={`${selectId}-hint`}
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
