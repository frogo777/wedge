"use client";

import Link from "next/link";
import { wt } from "@/design-system/tokens";

/**
 * Error boundary global en el DS oscuro (antes caía a la pantalla de error default).
 * Debe ser client component y recibe { error, reset }.
 */

const btnBase: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  height: 46, padding: "0 20px", borderRadius: wt.radius.md, textDecoration: "none",
  border: "none", cursor: "pointer", ...wt.text.label,
};

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: "100svh", background: wt.color.bgPrimary, color: wt.color.text, fontFamily: wt.font.sans, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center", gap: 16 }}>
      <div style={{ ...wt.text.micro, color: wt.color.textMuted }}>Algo salió mal</div>
      <h1 style={{ ...wt.text.h1, color: wt.color.text, margin: 0 }}>Tuvimos un problema.</h1>
      <p style={{ ...wt.text.body, color: wt.color.textMuted, margin: 0, maxWidth: 420 }}>
        Ocurrió un error inesperado. Puedes reintentar; si sigue pasando, escríbenos a{" "}
        <a href="mailto:hola@wedgemx.com" style={{ color: wt.color.orangeInk, textDecoration: "none", fontWeight: 560 }}>hola@wedgemx.com</a>.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
        <button onClick={() => reset()} style={{ ...btnBase, background: wt.color.orange, color: wt.color.textInverse }}>Reintentar</button>
        <Link href="/" style={{ ...btnBase, background: "transparent", color: wt.color.textSecondary, border: `1px solid ${wt.color.border}` }}>Ir al inicio</Link>
      </div>
    </div>
  );
}
