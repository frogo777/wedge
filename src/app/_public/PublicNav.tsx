"use client";

/**
 * PublicNav — navegación pública. Va en el slot `header` de PublicShell.
 *
 * Desktop: logo · links (ocultos en mobile vía `.wds-nav-links`) · CTA "Hacer diagnóstico".
 * Mobile (≤860px, Fase 3B.1): logo · botón hamburguesa → sheet full-screen con
 * todos los links + CTA. Bloquea el scroll del body mientras está abierto.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { wt } from "@/design-system/tokens";
import { LogoLockup } from "@/design-system";
import { createClient } from "@/lib/supabase/client";

const LINKS: { label: string; href: string }[] = [
  { label: "Inicio", href: "/" },
  { label: "Cómo funciona", href: "/#como-funciona" },
  { label: "Seguridad", href: "/#seguridad" },
  { label: "luk", href: "/luk" },
  { label: "Precios", href: "/precios" },
  { label: "Diagnóstico", href: "/diagnostico" },
];

const CTA_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 38,
  padding: `0 ${wt.space[5]}px`,
  background: wt.color.orange,
  color: wt.color.textInverse,
  borderRadius: wt.radius.md,
  fontFamily: wt.font.sans,
  fontSize: 14,
  fontWeight: 560,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const ICON_BTN_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  background: "transparent",
  border: `1px solid ${wt.color.border}`,
  borderRadius: wt.radius.md,
  color: wt.color.text,
  cursor: "pointer",
};

export function PublicNav() {
  const [open, setOpen] = useState(false);

  // R7.5: con sesión activa el CTA principal lleva a "Ir a mi Mes Fiscal" (no empuja a diagnóstico
  // al usuario ya autenticado). getSession() lee la cookie local (sin red); SSR-safe (corre tras montar).
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await createClient().auth.getSession();
        if (!cancelled) setAuthed(!!data.session);
      } catch { /* sin red / sin sesión: queda en el CTA público */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const ctaHref = authed ? "/app/mes" : "/diagnostico";
  const ctaLabel = authed ? "Ir a mi Mes Fiscal" : "Hacer diagnóstico";

  // Bloquea el scroll del body mientras el sheet está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* La hamburguesa solo aparece en mobile; el CTA inline solo en desktop.
          Mismo breakpoint (860px) que `.wds-nav-links`. */}
      <style>{`
        .pn-burger { display: none; }
        @media (max-width: 860px) {
          .pn-cta-desktop { display: none !important; }
          .pn-burger { display: inline-flex !important; }
        }
      `}</style>

      <div
        style={{
          maxWidth: wt.maxWidth.app,
          margin: "0 auto",
          padding: `${wt.space[4]}px ${wt.space[6]}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: wt.space[5],
        }}
      >
        <Link href="/" aria-label="Wedge — inicio" style={{ display: "inline-flex", textDecoration: "none" }}>
          <LogoLockup variant="horizontal" tone="dark" size="sm" />
        </Link>

        {/* Links desktop (ocultos ≤860px) */}
        <nav className="wds-nav-links" aria-label="Navegación principal">
          {LINKS.slice(1, 5).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                ...wt.text.label,
                color: wt.color.textSecondary,
                textDecoration: "none",
                padding: `8px 12px`,
                borderRadius: wt.radius.md,
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* CTA desktop (según sesión) */}
        <Link href={ctaHref} className="pn-cta-desktop" style={CTA_STYLE}>
          {ctaLabel}
        </Link>

        {/* Hamburguesa mobile */}
        <button
          type="button"
          className="pn-burger"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          style={ICON_BTN_STYLE}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Sheet mobile full-screen */}
      {open && (
        <div
          className="wds-root"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: wt.color.bgPrimary,
            display: "flex",
            flexDirection: "column",
            padding: `${wt.space[5]}px ${wt.space[6]}px`,
            paddingTop: "max(16px, env(safe-area-inset-top, 0px))",
            paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link
              href="/"
              aria-label="Wedge — inicio"
              onClick={() => setOpen(false)}
              style={{ display: "inline-flex", textDecoration: "none" }}
            >
              <LogoLockup variant="horizontal" tone="dark" size="sm" />
            </Link>
            <button type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)} style={ICON_BTN_STYLE}>
              <X size={20} />
            </button>
          </div>

          <nav
            aria-label="Navegación móvil"
            style={{ display: "flex", flexDirection: "column", marginTop: wt.space[7], gap: 2 }}
          >
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                style={{
                  ...wt.text.bodyLg,
                  color: wt.color.textSecondary,
                  textDecoration: "none",
                  padding: `${wt.space[4]}px ${wt.space[2]}px`,
                  borderBottom: `1px solid ${wt.color.border}`,
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <Link
            href={ctaHref}
            onClick={() => setOpen(false)}
            style={{ ...CTA_STYLE, height: 48, justifyContent: "center", marginTop: wt.space[7] }}
          >
            {ctaLabel}
          </Link>
        </div>
      )}
    </>
  );
}
