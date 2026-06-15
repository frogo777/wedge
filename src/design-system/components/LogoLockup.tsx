/**
 * LogoLockup — marca Wedge reutilizable (Design System, Fase 2).
 *
 * Reutiliza la geometría del logo APROBADO (citrus slice segmentado de
 * `@/app/components` WedgeMark) — NO se rediseña. Unifica el naranja a #F36F21
 * (`--wds-orange`) y añade variantes para todos los contextos.
 *
 * Variantes:
 *   variant: horizontal | stacked | iconOnly
 *   tone:    dark (sobre fondo oscuro) | light (sobre fondo claro) | monochrome
 *   size:    sm | md | lg
 *   tagline: muestra "Fiscal OS"
 */
import { wt } from "@/design-system/tokens";

type Variant = "horizontal" | "stacked" | "iconOnly";
type Tone = "dark" | "light" | "monochrome";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { icon: number; word: number; tag: number; gap: number }> = {
  sm: { icon: 22, word: 16, tag: 9, gap: 8 },
  md: { icon: 30, word: 21, tag: 11, gap: 10 },
  lg: { icon: 40, word: 28, tag: 13, gap: 13 },
};

function resolveTone(tone: Tone, mono?: string) {
  switch (tone) {
    case "light":
      return { mark: "#F36F21", divider: "#FFFFFF", word: "#111827", tag: "#64748B" };
    case "monochrome": {
      const c = mono ?? wt.color.text;
      return { mark: c, divider: wt.color.bgPrimary, word: c, tag: c };
    }
    case "dark":
    default:
      // El logo conserva el naranja de MARCA (#F36F21), no el UI orange.
      return { mark: wt.color.orangeLogo, divider: wt.color.bgPrimary, word: wt.color.text, tag: wt.color.textMuted };
  }
}

/** El mark aprobado: semi-disco + arco de cáscara + 7 divisores = 8 segmentos. */
function WedgeSlice({ size, mark, divider }: { size: number; mark: string; divider: string }) {
  return (
    <svg width={size} height={size * (40 / 48)} viewBox="0 0 48 40" aria-hidden style={{ display: "block", flexShrink: 0 }}>
      <path d="M 4.5 34 A 19.5 19.5 0 0 1 43.5 34" stroke={mark} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M 7.5 34 A 16.5 16.5 0 0 1 40.5 34 Z" fill={mark} />
      <g stroke={divider} strokeWidth="1.7" strokeLinecap="round">
        <line x1="7.5" y1="34" x2="40.5" y2="34" />
        <line x1="24" y1="34" x2="24" y2="17.5" />
        <line x1="24" y1="34" x2="17.7" y2="18.7" />
        <line x1="24" y1="34" x2="30.3" y2="18.7" />
        <line x1="24" y1="34" x2="12.3" y2="22.3" />
        <line x1="24" y1="34" x2="35.7" y2="22.3" />
        <line x1="24" y1="34" x2="9" y2="28.7" />
        <line x1="24" y1="34" x2="39" y2="28.7" />
      </g>
    </svg>
  );
}

export interface LogoLockupProps {
  variant?: Variant;
  tone?: Tone;
  size?: Size;
  tagline?: boolean;
  /** Color para tone="monochrome". */
  monoColor?: string;
  className?: string;
}

export function LogoLockup({
  variant = "horizontal",
  tone = "dark",
  size = "md",
  tagline = false,
  monoColor,
  className,
}: LogoLockupProps) {
  const s = SIZES[size];
  const c = resolveTone(tone, monoColor);
  const mark = <WedgeSlice size={s.icon} mark={c.mark} divider={c.divider} />;

  if (variant === "iconOnly") {
    return (
      <span className={className} aria-label="Wedge" role="img" style={{ display: "inline-flex" }}>
        {mark}
      </span>
    );
  }

  const wordmark = (
    <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1 }}>
      <span
        style={{
          fontFamily: wt.font.sans,
          fontSize: s.word,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: c.word,
        }}
      >
        wedge
      </span>
      {tagline && (
        <span
          style={{
            fontFamily: wt.font.sans,
            fontSize: s.tag,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: c.tag,
            marginTop: 3,
          }}
        >
          Fiscal OS
        </span>
      )}
    </span>
  );

  return (
    <span
      className={className}
      aria-label="Wedge Fiscal OS"
      role="img"
      style={{
        display: "inline-flex",
        flexDirection: variant === "stacked" ? "column" : "row",
        alignItems: "center",
        gap: s.gap,
      }}
    >
      {mark}
      {wordmark}
    </span>
  );
}
