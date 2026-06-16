"use client";

/**
 * /app/settings — Settings v1 (DS dark). Minimal por diseño (Settings hardening,
 * purga legacy): da a la experiencia v1 una página de cuenta NATIVA del DS con
 * **logout real** y datos básicos, sin el chrome legacy del viejo /settings
 * (que sigue existiendo aparte, auth-gated, para gestión avanzada).
 *
 * Auth-gated por /app (proxy.ts). Bajo /app/* → no se montan los overlays legacy
 * (AppBottomNav/QuickAddFab se auto-ocultan en /app/*). "Wedge prepara; tú validas en SAT."
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, ArrowRight } from "lucide-react";
import { wt } from "@/design-system/tokens";
import { AppShell, LogoLockup, PageHeader, Card, Button, SecurityNotice } from "@/design-system";
import { AppSidebarNav } from "@/app/app/_components/AppSidebarNav";
import { AppMobileNav } from "@/app/app/_components/AppMobileNav";
import { createClient } from "@/lib/supabase/client";

const legalLink: React.CSSProperties = {
  color: wt.color.orangeInk,
  textDecoration: "none",
  ...wt.text.bodySm,
};

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null);
    });
    return () => { active = false; };
    // supabase es estable (createClient); intencional una sola corrida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } catch {
      /* aunque falle el server, limpiamos local y mandamos a /login */
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <AppShell
      className="settings-shell"
      maxWidth={760}
      sidebar={<AppSidebarNav />}
      topbar={
        <div style={{ maxWidth: 760, margin: "0 auto", padding: `${wt.space[4]}px ${wt.space[6]}px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: wt.space[4], flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: wt.space[4], minWidth: 0 }}>
            <span className="settings-topbar-logo" style={{ display: "none" }}><LogoLockup variant="iconOnly" tone="dark" size="sm" /></span>
            <span style={{ ...wt.text.label, color: wt.color.text }}>Ajustes</span>
          </div>
          <span style={{ ...wt.text.caption, color: wt.color.textMuted }}>tu cuenta</span>
        </div>
      }
    >
      <style>{`
        @media (max-width: 860px) {
          .settings-shell { grid-template-columns: 1fr !important; }
          .settings-shell > aside { display: none !important; }
          .settings-topbar-logo { display: inline-flex !important; }
        }
      `}</style>

      <PageHeader
        overline="Tu cuenta"
        title="Ajustes"
        description="Tu cuenta y tu sesión. Wedge prepara; tú validas y presentas en SAT."
        back={{ label: "Volver al Mes Fiscal", href: "/app/mes" }}
      />

      {/* Cuenta */}
      <Card variant="default" padding="comfortable" style={{ marginBottom: wt.space[6] }}>
        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[4] }}>Cuenta</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: wt.space[4], flexWrap: "wrap" }}>
          <span style={{ ...wt.text.bodySm, color: wt.color.textSecondary }}>Correo</span>
          <span style={{ ...wt.data.md, fontFamily: wt.font.mono, color: wt.color.text }}>{email ?? "…"}</span>
        </div>
        <p style={{ ...wt.text.caption, color: wt.color.textMuted, margin: `${wt.space[4]}px 0 0` }}>
          Tu sesión está protegida por Supabase. Wedge guarda solo un resumen redactado de tu Mes Fiscal — no tus XML ni datos del SAT.
        </p>
      </Card>

      {/* Sesión */}
      <Card variant="default" padding="comfortable" style={{ marginBottom: wt.space[6] }}>
        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>Sesión</div>
        <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: `0 0 ${wt.space[5]}px` }}>
          Cierra tu sesión en este dispositivo. Podrás volver a entrar cuando quieras.
        </p>
        <Button variant="secondary" onClick={handleLogout} loading={loggingOut} leftIcon={<LogOut size={16} />}>
          {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
        </Button>
      </Card>

      {/* Legal y privacidad */}
      <Card variant="quiet" padding="comfortable" style={{ marginBottom: wt.space[6] }}>
        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[4] }}>Legal y privacidad</div>
        <div style={{ display: "flex", flexDirection: "column", gap: wt.space[3], alignItems: "flex-start" }}>
          <Link href="/privacidad" style={legalLink}>Aviso de privacidad</Link>
          <Link href="/terminos" style={legalLink}>Términos y condiciones</Link>
          <Link href="/legal/uso-credenciales-sat" style={legalLink}>Uso de credenciales SAT</Link>
          <Link href="/eliminar-cuenta" style={{ ...legalLink, color: wt.color.textMuted }}>Eliminar mi cuenta (ARCO)</Link>
        </div>
      </Card>

      <section style={{ marginBottom: wt.space[8], display: "flex", flexDirection: "column", gap: wt.space[5] }}>
        <p style={{ ...wt.text.caption, color: wt.color.textMuted, margin: 0 }}>Más opciones de cuenta llegarán pronto.</p>
        <SecurityNotice>Wedge no declara, no paga ni modifica información en SAT.</SecurityNotice>
        <div>
          <Button variant="ghost" onClick={() => router.push("/app/mes")} leftIcon={<ArrowRight size={16} />}>Volver al Mes Fiscal</Button>
        </div>
      </section>

      <AppMobileNav />
    </AppShell>
  );
}
