import Link from "next/link";
import { wt } from "@/design-system/tokens";
import { LogoLockup } from "@/design-system";

/**
 * 404 global en el DS oscuro (antes caía al 404 default blanco de Next).
 */

const btnBase: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  height: 46, padding: "0 20px", borderRadius: wt.radius.md, textDecoration: "none",
  ...wt.text.label,
};

export default function NotFound() {
  return (
    <div style={{ minHeight: "100svh", background: wt.color.bgPrimary, color: wt.color.text, fontFamily: wt.font.sans, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center", gap: 16 }}>
      <LogoLockup variant="horizontal" tone="dark" size="md" />
      <div style={{ ...wt.text.micro, color: wt.color.textMuted }}>Error 404</div>
      <h1 style={{ ...wt.text.h1, color: wt.color.text, margin: 0 }}>No encontramos esta página.</h1>
      <p style={{ ...wt.text.body, color: wt.color.textMuted, margin: 0, maxWidth: 420 }}>
        El enlace puede estar roto o la página se movió. Vuelve al inicio o a tu Mes Fiscal.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
        <Link href="/" style={{ ...btnBase, background: wt.color.orange, color: wt.color.textInverse }}>Ir al inicio</Link>
        <Link href="/app/mes" style={{ ...btnBase, background: "transparent", color: wt.color.textSecondary, border: `1px solid ${wt.color.border}` }}>Ir a mi Mes Fiscal</Link>
      </div>
    </div>
  );
}
