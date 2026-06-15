import type { Metadata } from "next";
import { wt } from "@/design-system/tokens";
import { PublicShell, Card, SecurityNotice } from "@/design-system";
import { PublicNav } from "@/app/_public/PublicNav";
import { PublicFooter } from "@/app/_public/PublicFooter";

/**
 * /eliminar-cuenta — derecho ARCO de borrado (LFPDPPP). Mientras el borrado automático
 * no existe, documentamos el proceso manual verificado. NO borra cuentas automáticamente.
 * Enlazada desde /app/settings ("Eliminar mi cuenta (ARCO)").
 */

export const metadata: Metadata = {
  title: "Eliminar mi cuenta — wedge",
  description: "Cómo solicitar la eliminación de tu cuenta de wedge y de tus datos (derechos ARCO).",
  robots: { index: false, follow: false },
  alternates: { canonical: "/eliminar-cuenta" },
};

const SUPPORT_EMAIL = "hola@wedgemx.com";
const MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Eliminar mi cuenta")}`;

export default function EliminarCuentaPage() {
  return (
    <PublicShell header={<PublicNav />} footer={<PublicFooter />} maxWidth={780}>
      <section style={{ padding: `${wt.space[6]}px 0 ${wt.space[8]}px` }}>
        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>Tus datos · Derechos ARCO</div>
        <h1 style={{ ...wt.text.displayLg, color: wt.color.text, margin: 0 }}>Eliminar mi cuenta.</h1>
        <p style={{ ...wt.text.bodyLg, color: wt.color.textMuted, margin: `${wt.space[5]}px 0 0`, maxWidth: 620 }}>
          Puedes solicitar la eliminación de tu cuenta y de los datos que guardamos de ti (derechos ARCO de la LFPDPPP).
        </p>
      </section>

      <section style={{ marginBottom: wt.space[8] }}>
        <Card variant="default" padding="comfortable">
          <div style={{ ...wt.text.label, color: wt.color.text, marginBottom: wt.space[3] }}>Cómo solicitarlo</div>
          <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: 0, lineHeight: 1.6 }}>
            Mientras habilitamos el borrado automático, lo hacemos de forma manual y verificada. Escríbenos a{" "}
            <a href={MAILTO} style={{ color: wt.color.orangeInk, textDecoration: "none", fontWeight: 560 }}>{SUPPORT_EMAIL}</a>{" "}
            <strong style={{ color: wt.color.text }}>desde el mismo correo de tu cuenta</strong>, con el asunto “Eliminar mi cuenta”. Verificamos que seas tú y eliminamos tu cuenta y tu snapshot guardado.
          </p>
          <ul style={{ margin: `${wt.space[5]}px 0 0`, paddingLeft: 18, ...wt.text.bodySm, color: wt.color.textMuted, lineHeight: 1.7 }}>
            <li>Eliminamos tu usuario y el resumen redactado que hayas guardado.</li>
            <li>No guardamos tus XML/CFDIs ni tu CIEC/e.firma, así que no hay nada de eso que borrar.</li>
            <li>Te confirmamos por correo cuando esté hecho.</li>
          </ul>
          <div style={{ marginTop: wt.space[6] }}>
            <a
              href={MAILTO}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 46, padding: "0 20px", background: wt.color.orange, color: wt.color.textInverse, borderRadius: wt.radius.md, ...wt.text.label, textDecoration: "none" }}
            >
              Escribir para eliminar mi cuenta
            </a>
          </div>
        </Card>
      </section>

      <section style={{ marginBottom: wt.space[8] }}>
        <SecurityNotice>Wedge prepara; tú validas y presentas en SAT. No declaramos ni pagamos por ti.</SecurityNotice>
      </section>
    </PublicShell>
  );
}
