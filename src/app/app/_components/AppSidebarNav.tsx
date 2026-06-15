"use client";

/**
 * AppSidebarNav — navegación lateral compartida de las pantallas internas (/app/*).
 * Mes y CFDIs son enlaces reales (activo según la ruta); el resto queda "Pronto".
 * Se usa en /app/mes y /app/cfdis para mantener una sola nav consistente.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, FileText, ClipboardCheck, Sparkles, Clock, Settings } from "lucide-react";
import { wt } from "@/design-system/tokens";
import { LogoLockup, Badge } from "@/design-system";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href?: string;
}

const ITEMS: NavItem[] = [
  { label: "Mes", icon: <Calendar size={17} />, href: "/app/mes" },
  { label: "CFDIs", icon: <FileText size={17} />, href: "/app/cfdis" },
  { label: "Guía SAT", icon: <ClipboardCheck size={17} /> },
  { label: "luk", icon: <Sparkles size={17} />, href: "/app/luk" },
  { label: "Historial", icon: <Clock size={17} /> },
  { label: "Settings", icon: <Settings size={17} />, href: "/app/settings" },
];

export function AppSidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegación de la app" style={{ padding: `${wt.space[6]}px ${wt.space[4]}px`, display: "flex", flexDirection: "column", gap: wt.space[5] }}>
      <div style={{ padding: `0 ${wt.space[3]}px` }}>
        <LogoLockup variant="horizontal" tone="dark" size="sm" tagline />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {ITEMS.map((item) => {
          const active = item.href ? pathname === item.href : false;
          const enabled = !!item.href;
          const row = (
            <div
              aria-current={active ? "page" : undefined}
              aria-disabled={enabled ? undefined : true}
              style={{
                display: "flex", alignItems: "center", gap: wt.space[3],
                padding: `${wt.space[3]}px ${wt.space[3]}px`,
                borderRadius: wt.radius.md,
                ...wt.text.label,
                color: active ? wt.color.text : wt.color.textMuted,
                background: active ? wt.color.surface2 : "transparent",
                cursor: enabled ? (active ? "default" : "pointer") : "not-allowed",
                opacity: enabled ? 1 : 0.7,
              }}
            >
              <span style={{ display: "inline-flex", color: active ? wt.color.orangeInk : wt.color.textMuted }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {!enabled && <Badge variant="outline" size="sm">Pronto</Badge>}
            </div>
          );
          return enabled ? (
            <Link key={item.label} href={item.href!} style={{ textDecoration: "none" }}>{row}</Link>
          ) : (
            <div key={item.label}>{row}</div>
          );
        })}
      </div>
    </nav>
  );
}
