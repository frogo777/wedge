"use client";

/**
 * PublicFooter — footer público (Fase 3A). Slot `footer` de PublicShell.
 * Marca + ancla de reparto ("Wedge prepara; tú validas") + links + legal.
 */
import Link from "next/link";
import { wt } from "@/design-system/tokens";
import { LogoLockup } from "@/design-system";

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Producto",
    links: [
      { label: "Hacer diagnóstico", href: "/diagnostico" },
      { label: "Cómo funciona", href: "/#como-funciona" },
      { label: "Seguridad", href: "/#seguridad" },
      { label: "luk", href: "/luk" },
      { label: "Precios", href: "/precios" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Aviso de privacidad", href: "/privacidad" },
      { label: "Términos", href: "/terminos" },
      { label: "Uso de credenciales SAT", href: "/legal/uso-credenciales-sat" },
    ],
  },
];

export function PublicFooter() {
  return (
    <div style={{ maxWidth: wt.maxWidth.app, margin: "0 auto", padding: `${wt.space[10]}px ${wt.space[6]}px ${wt.space[8]}px` }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: wt.space[10], justifyContent: "space-between" }}>
        <div style={{ maxWidth: 320 }}>
          <LogoLockup variant="horizontal" tone="dark" size="sm" tagline />
          <p style={{ ...wt.text.bodySm, color: wt.color.textMuted, margin: `${wt.space[4]}px 0 0` }}>
            Tu mes fiscal, claro antes del día 17. Wedge prepara; tú validas y presentas en el SAT.
          </p>
        </div>
        <div style={{ display: "flex", gap: wt.space[10], flexWrap: "wrap" }}>
          {COLS.map((col) => (
            <div key={col.title}>
              <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[4] }}>{col.title}</div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: wt.space[3] }}>
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} style={{ ...wt.text.bodySm, color: wt.color.textSecondary, textDecoration: "none" }}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: wt.space[9], paddingTop: wt.space[5], borderTop: `1px solid ${wt.color.border}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: wt.space[3] }}>
        <span style={{ ...wt.text.caption, color: wt.color.textMuted }}>© 2026 Wedge · México · No somos contadores ni representantes fiscales.</span>
        <span style={{ ...wt.text.caption, color: wt.color.textMuted }}>Hecho para freelancers y personas físicas.</span>
      </div>
    </div>
  );
}
