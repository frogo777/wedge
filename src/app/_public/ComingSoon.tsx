import { ArrowRight } from "lucide-react";
import { wt } from "@/design-system/tokens";
import { PublicShell, TrustPanel, PermissionList, SecurityNotice } from "@/design-system";
import { PublicNav } from "@/app/_public/PublicNav";
import { PublicFooter } from "@/app/_public/PublicFooter";
import { CtaLink } from "@/app/_public/CtaLink";

/**
 * ComingSoon — página DS "Próximamente" para features fuera del MVP público
 * (Fase 3B.4). Conserva la URL sin prometer funcionalidad: copy honesto + CTA al
 * diagnóstico. Server component (sin estado). El noindex lo aplica `robots.ts`.
 */
export function ComingSoon({
  eyebrow = "Próximamente",
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <PublicShell header={<PublicNav />} footer={<PublicFooter />} maxWidth={720}>
      <section style={{ padding: `${wt.space[8]}px 0 ${wt.space[9]}px`, maxWidth: 620 }}>
        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>{eyebrow}</div>
        <h1 style={{ ...wt.text.displayLg, color: wt.color.text, margin: 0 }}>{title}</h1>
        <p style={{ ...wt.text.bodyLg, color: wt.color.textMuted, margin: `${wt.space[5]}px 0 0` }}>{description}</p>
        <p style={{ ...wt.text.body, color: wt.color.textSecondary, margin: `${wt.space[4]}px 0 0` }}>
          Esta función todavía no forma parte del MVP público de Wedge. Empieza con el diagnóstico
          gratis para preparar tu Mes Fiscal.
        </p>
        <div style={{ display: "flex", gap: wt.space[4], flexWrap: "wrap", marginTop: wt.space[7] }}>
          <CtaLink href="/diagnostico" variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
            Hacer diagnóstico gratis
          </CtaLink>
          <CtaLink href="/" variant="ghost" size="lg">Volver al inicio</CtaLink>
        </div>
        <p style={{ ...wt.text.caption, color: wt.color.textMuted, marginTop: wt.space[4] }}>
          Sin conectar SAT · Sin tarjeta · Tú validas todo en SAT
        </p>
      </section>

      <section style={{ marginBottom: wt.space[8] }}>
        <TrustPanel
          title="Wedge prepara; tú validas en SAT."
          description="Mientras tanto, puedes preparar tu mes completo desde el diagnóstico."
          footnote={<SecurityNotice>Cifrado por usuario · no compartimos tus datos.</SecurityNotice>}
        >
          <PermissionList
            items={[
              { allowed: true, label: "Puedes empezar sin conectar SAT." },
              { allowed: true, label: "Puedes traer tus CFDIs con XML/ZIP." },
              { allowed: false, label: "Wedge no declara, no paga ni modifica información en SAT." },
            ]}
          />
        </TrustPanel>
      </section>
    </PublicShell>
  );
}
