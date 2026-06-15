"use client";

/**
 * AppMobileNav — barra de navegación inferior para /app/* en móvil (<860px), donde el
 * sidebar (aside) se oculta. Da acceso a Mes, CFDIs, luk, Settings y Logout sin reconstruir
 * el shell. Es position:fixed, así que se monta como hijo de AppShell pero se ancla al viewport.
 * Se oculta en >=860px (el sidebar desktop toma su lugar).
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, FileText, Sparkles, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { wt } from "@/design-system/tokens";

const ITEMS: { label: string; href: string; Icon: typeof Calendar }[] = [
  { label: "Mes", href: "/app/mes", Icon: Calendar },
  { label: "CFDIs", href: "/app/cfdis", Icon: FileText },
  { label: "luk", href: "/app/luk", Icon: Sparkles },
  { label: "Ajustes", href: "/app/settings", Icon: Settings },
];

const cell: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  gap: 3, padding: "8px 4px", textDecoration: "none", fontFamily: wt.font.sans,
  background: "transparent", border: "none", cursor: "pointer", minWidth: 0,
};

export function AppMobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  const onLogout = async () => {
    try {
      await createClient().auth.signOut();
    } catch { /* aun si falla el server, salimos */ }
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <nav
        className="wg-mobile-nav"
        aria-label="Navegación de la app (móvil)"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, display: "none",
          alignItems: "stretch", justifyContent: "space-around",
          background: wt.color.bgSecondary, borderTop: `1px solid ${wt.color.border}`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {ITEMS.map(({ label, href, Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} style={{ ...cell, ...wt.text.caption, color: active ? wt.color.orangeInk : wt.color.textMuted }}>
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={onLogout} aria-label="Cerrar sesión" style={{ ...cell, ...wt.text.caption, color: wt.color.textMuted }}>
          <LogOut size={20} />
          <span>Salir</span>
        </button>
      </nav>
      <style>{`
        @media (max-width: 860px) {
          .wg-mobile-nav { display: flex !important; }
          .mes-shell, .cfdis-shell, .luk-shell, .settings-shell { padding-bottom: 76px !important; }
        }
      `}</style>
    </>
  );
}
