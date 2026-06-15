import { Check, ArrowRight, ShieldCheck } from "lucide-react";
import { wt } from "@/design-system/tokens";
import {
  PublicShell, Card, Badge, TrustPanel, PermissionList, SecurityNotice,
} from "@/design-system";
import { PublicNav } from "@/app/_public/PublicNav";
import { PublicFooter } from "@/app/_public/PublicFooter";
import { CtaLink } from "@/app/_public/CtaLink";

/**
 * /precios — migrada al Wedge Fiscal OS Design System (Fase 3B.2).
 *
 * No es una tabla SaaS: vende SITUACIÓN y alivio, y lleva al diagnóstico (no al
 * checkout). Server component → SEO con metadata. El checkout Stripe (real, en
 * `/api/billing/checkout`) NO se cablea en esta fase (fuera de scope 3B.2); el API
 * queda intacto. Pricing mostrado: Free $0 y Pro $99 (Acceso Fundador) son reales
 * (coinciden con el repo); Business se presenta como "lanzamiento privado".
 *
 * La metadata de la ruta vive en `./layout.tsx` (fuente única).
 */

interface Situation {
  tag: string;
  name: string;
  price: string;
  priceNote: string;
  forWhom: string;
  features: string[];
  cta: { label: string; href: string };
  hero?: boolean;
}

const SITUATIONS: Situation[] = [
  {
    tag: "Diagnóstico",
    name: "Free",
    price: "$0",
    priceNote: "por siempre",
    forWhom: "Para entender tu situación inicial, sin compromiso.",
    features: [
      "Diagnóstico sin cuenta",
      "Tu mes en claro: listo / falta / sigue",
      "ISR e IVA estimados (cálculo informativo)",
      "Sin conectar SAT, sin tarjeta",
    ],
    cta: { label: "Hacer diagnóstico", href: "/diagnostico" },
  },
  {
    tag: "Mes Fiscal",
    name: "Pro",
    price: "$99",
    priceNote: "MXN / mes · Acceso Fundador",
    forWhom: "Para preparar tu mes completo y llegar listo al día 17.",
    features: [
      "Trae CFDIs con XML/ZIP o conexión SAT",
      "ISR, IVA y retenciones del mes",
      "Pendientes y próxima acción clara",
      "Recordatorio del día 17 e historial mensual",
      "Guía para validar en SAT",
      "luk: detecta lo que falta antes de que sea problema",
    ],
    cta: { label: "Empezar con diagnóstico", href: "/diagnostico" },
    hero: true,
  },
  {
    tag: "Avanzado",
    name: "Business",
    price: "Lanzamiento privado",
    priceNote: "multi-RFC y colaboración",
    forWhom: "Para varios RFCs, colaboración o más control.",
    features: [
      "Varios RFCs en un lugar",
      "Colaboración (próximamente)",
      "Más control y volumen",
    ],
    cta: { label: "Empezar con diagnóstico", href: "/diagnostico" },
  },
];

// Lo que incluye preparar tu mes completo (comparación clara, sin saturar).
const INCLUDED: string[] = [
  "Diagnóstico sin cuenta",
  "CFDIs por XML/ZIP",
  "Conexión SAT (opcional, más adelante)",
  "ISR e IVA del mes",
  "Retenciones",
  "Recordatorio del día 17",
  "Historial mensual",
  "Guía para validar en SAT",
  "luk contextual",
];

export default function PreciosPage() {
  return (
    <PublicShell header={<PublicNav />} footer={<PublicFooter />} maxWidth={1120}>
      {/* ── Hero ── */}
      <section style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", padding: `${wt.space[6]}px 0 ${wt.space[10]}px` }}>
        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>
          Precios · sin letra chica
        </div>
        <h1 style={{ ...wt.text.displayLg, color: wt.color.text, margin: 0 }}>
          Empieza entendiendo tu mes fiscal.
        </h1>
        <p style={{ ...wt.text.bodyLg, color: wt.color.textMuted, margin: `${wt.space[5]}px auto 0`, maxWidth: 560 }}>
          Haz un diagnóstico gratis y decide si necesitas preparar tu mes completo con Wedge.
        </p>
        <div style={{ display: "flex", justifyContent: "center", marginTop: wt.space[7] }}>
          <CtaLink href="/diagnostico" variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
            Hacer diagnóstico gratis
          </CtaLink>
        </div>
        <p style={{ ...wt.text.caption, color: wt.color.textMuted, marginTop: wt.space[4] }}>
          Sin conectar SAT · Sin tarjeta · Tú validas todo en SAT
        </p>
      </section>

      {/* ── Planes por situación ── */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: wt.space[5], alignItems: "stretch" }}>
        {SITUATIONS.map((s) => (
          <Card key={s.name} variant={s.hero ? "hero" : "default"} padding="comfortable" style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: wt.space[3], marginBottom: wt.space[4] }}>
              <Badge variant={s.hero ? "accent" : "neutral"}>{s.tag}</Badge>
              {s.hero && <Badge variant="outline">Más usado</Badge>}
            </div>

            <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[2] }}>{s.name}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: wt.space[3], flexWrap: "wrap" }}>
              <span style={{
                ...(s.price.startsWith("$") ? wt.data.xl : wt.text.h3),
                fontFamily: s.price.startsWith("$") ? wt.font.mono : wt.font.sans,
                color: wt.color.text,
              }}>
                {s.price}
              </span>
            </div>
            <div style={{ ...wt.text.caption, color: wt.color.textMuted, marginTop: wt.space[2] }}>{s.priceNote}</div>

            <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: `${wt.space[5]}px 0 ${wt.space[5]}px` }}>
              {s.forWhom}
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: wt.space[3], flex: 1 }}>
              {s.features.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: wt.space[3], ...wt.text.bodySm, color: wt.color.textSecondary }}>
                  <span aria-hidden style={{ display: "inline-flex", flexShrink: 0, marginTop: 1, color: s.hero ? wt.color.orangeInk : wt.color.textMuted }}>
                    <Check size={15} strokeWidth={2.25} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <div style={{ marginTop: wt.space[7] }}>
              <CtaLink href={s.cta.href} variant={s.hero ? "primary" : "secondary"} size="md" style={{ width: "100%" }}>
                {s.cta.label}
              </CtaLink>
            </div>
          </Card>
        ))}
      </section>

      <p style={{ ...wt.text.caption, color: wt.color.textMuted, textAlign: "center", marginTop: wt.space[5] }}>
        Precios en MXN. El plan Free no necesita tarjeta. Wedge prepara tu información; tú validas y presentas en SAT.
      </p>

      {/* ── Qué incluye preparar tu mes ── */}
      <section style={{ marginTop: wt.space[12] }}>
        <Card variant="quiet" padding="comfortable">
          <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[2] }}>Preparar tu mes completo</div>
          <h2 style={{ ...wt.text.h2, color: wt.color.text, margin: `0 0 ${wt.space[6]}px` }}>Qué incluye tu Mes Fiscal</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: wt.space[4] }}>
            {INCLUDED.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: wt.space[3], ...wt.text.bodySm, color: wt.color.textSecondary }}>
                <span aria-hidden style={{ display: "inline-flex", flexShrink: 0, color: wt.color.trustBlueGray }}>
                  <Check size={15} strokeWidth={2.25} />
                </span>
                {item}
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* ── Confianza ── */}
      <section style={{ marginTop: wt.space[10], maxWidth: 720, margin: `${wt.space[10]}px auto 0` }}>
        <TrustPanel
          title="Wedge prepara; tú validas en SAT."
          description="Pagues lo que pagues, la decisión final siempre es tuya."
          footnote={<SecurityNotice>Tus credenciales se cifran (AES-256) y solo tú las usas.</SecurityNotice>}
        >
          <PermissionList
            items={[
              { allowed: true,  label: "Puedes empezar sin conectar SAT." },
              { allowed: true,  label: "Puedes traer tus CFDIs con XML/ZIP." },
              { allowed: false, label: "Wedge no declara, no paga ni modifica información en SAT." },
            ]}
          />
        </TrustPanel>
      </section>

      {/* ── CTA final ── */}
      <section style={{ textAlign: "center", padding: `${wt.space[12]}px 0 ${wt.space[6]}px` }}>
        <h2 style={{ ...wt.text.h1, color: wt.color.text, margin: `0 0 ${wt.space[3]}px` }}>Haz tu diagnóstico gratis.</h2>
        <p style={{ ...wt.text.body, color: wt.color.textMuted, margin: `0 auto ${wt.space[7]}px`, maxWidth: 520 }}>
          En 2 minutos sabes cómo está tu mes y decides el siguiente paso. Sin cuenta, sin tarjeta.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: wt.space[4], flexWrap: "wrap" }}>
          <CtaLink href="/diagnostico" variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
            Hacer diagnóstico gratis
          </CtaLink>
          <CtaLink href="/seguridad" variant="ghost" size="lg" leftIcon={<ShieldCheck size={16} />}>
            Cómo cuidamos tus datos
          </CtaLink>
        </div>
      </section>
    </PublicShell>
  );
}
