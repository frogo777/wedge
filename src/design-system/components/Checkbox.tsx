"use client";

/**
 * Checkbox — Design System (Fase 2).
 *
 * Checkbox custom dark: input nativo oculto (accesible) + caja dibujada.
 * checked → bg naranja + check (textInverse). indeterminate → Minus.
 * Estados: hover, focus (ring naranja), disabled. Tap target ≥20px.
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";
import { Check, Minus } from "lucide-react";
import { wt } from "@/design-system/tokens";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  indeterminate?: boolean;
}

export function Checkbox({
  label,
  indeterminate = false,
  checked,
  id,
  disabled,
  style,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: CheckboxProps) {
  const [focus, setFocus] = useState(false);
  const [hover, setHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reactId = useId();
  const boxId = id ?? reactId;

  // El estado indeterminate solo existe a nivel DOM property.
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const isMarked = !!checked || indeterminate;

  const boxBg = isMarked
    ? disabled
      ? wt.color.orangeMuted
      : wt.color.orange
    : wt.color.surface;
  const boxBorder = isMarked
    ? "transparent"
    : hover && !disabled
    ? wt.color.borderStrong
    : wt.color.border;

  return (
    <label
      htmlFor={boxId}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: wt.space[4],
        minHeight: 20,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: wt.font.sans,
        userSelect: "none",
        ...style,
      }}
    >
      <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
        <input
          {...rest}
          ref={inputRef}
          id={boxId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-checked={indeterminate ? "mixed" : !!checked}
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
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            margin: 0,
            opacity: 0,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        />
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            background: boxBg,
            border: `1px solid ${boxBorder}`,
            borderRadius: wt.radius.sm,
            color: wt.color.textInverse,
            boxShadow: focus && !disabled ? wt.shadow.focus : "none",
            transition: `background ${wt.motion.base} ${wt.motion.ease}, border-color ${wt.motion.base} ${wt.motion.ease}, box-shadow ${wt.motion.base} ${wt.motion.ease}`,
          }}
        >
          {indeterminate ? (
            <Minus size={14} strokeWidth={3} />
          ) : checked ? (
            <Check size={14} strokeWidth={3} />
          ) : null}
        </span>
      </span>

      {label && (
        <span
          style={{
            ...wt.text.body,
            color: wt.color.text,
          }}
        >
          {label}
        </span>
      )}
    </label>
  );
}
