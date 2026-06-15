import type { Metadata } from "next";
import Link from "next/link";
import { wt } from "@/design-system/tokens";
import { Card, LogoLockup, SecurityNotice } from "@/design-system";

/**
 * /login/2fa — placeholder seguro. La verificación en dos pasos (AAL2) está diferida
 * en Wedge v1. login/page.tsx puede empujar aquí si un usuario tuviera un factor MFA
 * inscrito; en lugar de un 404, mostramos una explicación honesta y un camino de vuelta.
 * NO implementa MFA. Hereda noindex del login/layout.tsx.
 */

export const metadata: Metadata = {
  title: "Verificación en dos pasos — wedge",
  robots: { index: false, follow: false },
};

const FONT = wt.font.sans;

export default function TwoFactorPlaceholder() {
  return (
    <div className="wds-root" style={{ minHeight: "100svh", background: wt.color.bgPrimary, color: wt.color.text, fontFamily: FONT, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ marginBottom: wt.space[7] }}>
          <Link href="/" aria-label="Wedge — inicio" style={{ display: "inline-flex", textDecoration: "none" }}>
            <LogoLockup variant="horizontal" tone="dark" size="md" />
          </Link>
        </div>

        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>Verificación en dos pasos</div>
        <h1 style={{ ...wt.text.h1, color: wt.color.text, margin: 0 }}>2FA todavía no está activo.</h1>
        <p style={{ ...wt.text.body, color: wt.color.textMuted, margin: `${wt.space[3]}px 0 0` }}>
          La verificación en dos pasos aún no está disponible en Wedge v1. Si llegaste aquí, tu sesión está bien:
          continúa entrando con tu correo y contraseña.
        </p>

        <Card variant="default" padding="comfortable" style={{ marginTop: wt.space[7] }}>
          <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: 0, lineHeight: 1.6 }}>
            ¿Algún problema para entrar? Escríbenos a{" "}
            <a href="mailto:hola@wedgemx.com" style={{ color: wt.color.orangeInk, textDecoration: "none", fontWeight: 560 }}>hola@wedgemx.com</a>.
          </p>
          <div style={{ marginTop: wt.space[5] }}>
            <Link
              href="/login"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 48, padding: "0 20px", width: "100%", boxSizing: "border-box", background: wt.color.orange, color: wt.color.textInverse, borderRadius: wt.radius.md, ...wt.text.label, textDecoration: "none" }}
            >
              Volver a iniciar sesión
            </Link>
          </div>
        </Card>

        <div style={{ display: "flex", justifyContent: "center", marginTop: wt.space[6] }}>
          <SecurityNotice>Wedge prepara; tú validas y presentas en SAT.</SecurityNotice>
        </div>
      </div>
    </div>
  );
}
