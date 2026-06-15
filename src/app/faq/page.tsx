import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { wt } from "@/design-system/tokens";
import { PublicShell, TrustPanel, PermissionList, SecurityNotice } from "@/design-system";
import { PublicNav } from "@/app/_public/PublicNav";
import { PublicFooter } from "@/app/_public/PublicFooter";
import { CtaLink } from "@/app/_public/CtaLink";

/**
 * /faq — migrada al Wedge Fiscal OS Design System (Fase 3B.3).
 *
 * No es un basurero de preguntas: categorías claras + progressive disclosure
 * (`<details>` nativo, sin JS). Server component → conserva FAQPage JSON-LD y
 * metadata. CTA principal → /diagnostico. Sin escasez, sin claims prohibidos;
 * luk se menciona como copiloto fiscal contextual.
 */
export const metadata: Metadata = {
  title: "Preguntas frecuentes — wedge",
  description:
    "Dudas claras sobre diagnóstico, SAT, CFDIs, ISR, IVA, luk, precios y seguridad. Wedge prepara tu Mes Fiscal; tú validas y presentas en SAT.",
  alternates: { canonical: "/faq" },
};

type QA = { q: string; a: string };
type Category = { title: string; items: QA[] };

const CATEGORIES: Category[] = [
  {
    title: "Antes de empezar",
    items: [
      { q: "¿Necesito cuenta o tarjeta para empezar?", a: "No. Empiezas con un diagnóstico gratis, sin cuenta y sin tarjeta. Solo creas cuenta si quieres guardar tu mes fiscal y darle seguimiento." },
      { q: "¿Qué hace Wedge exactamente?", a: "Convierte tus CFDIs, ISR, IVA, retenciones y pendientes en un Mes Fiscal claro antes del día 17. Wedge prepara; tú validas y presentas en SAT." },
    ],
  },
  {
    title: "SAT y datos",
    items: [
      { q: "¿Wedge presenta mi declaración?", a: "No. Wedge prepara tu información para que tú valides y presentes en SAT. Organiza CFDIs, pendientes y estimaciones informativas; la presentación final ocurre en SAT." },
      { q: "¿Necesito conectar el SAT?", a: "No. Puedes empezar sin conectar SAT y traer tus CFDIs con XML/ZIP. Conectar el SAT es opcional y reversible cuando quieras." },
      { q: "¿Cómo cuidan mis datos fiscales?", a: "Cifrado por usuario (AES-256), aislamiento por usuario (RLS) y borrado real. Wedge no declara, no paga ni modifica información en SAT. Más detalle en /seguridad." },
    ],
  },
  {
    title: "CFDIs, ISR e IVA",
    items: [
      { q: "¿Cómo traigo mis CFDIs?", a: "Subiendo XML/ZIP, o conectando el SAT más adelante (opcional). Tú decides el camino." },
      { q: "¿Los cálculos son exactos?", a: "Son un cálculo informativo con tarifas oficiales LISR/LIVA 2026 (RESICO PF Art. 113-E, Honorarios Art. 96). No es asesoría certificada: tú validas y presentas en SAT." },
      { q: "¿Funciona para RESICO PF y Honorarios?", a: "Sí. RESICO PF es el régimen principal; también soportamos Honorarios. El diagnóstico te orienta si no estás seguro de tu régimen." },
    ],
  },
  {
    title: "luk",
    items: [
      { q: "¿Qué es luk?", a: "luk es tu copiloto fiscal dentro de Wedge: detecta lo que falta y te explica qué revisar (CFDIs, IVA, retenciones, pendientes). No presenta declaraciones." },
      { q: "¿luk es un contador?", a: "No. luk te ayuda a entender qué revisar antes del día 17; la validación final es tuya (o de tu contador) en SAT." },
    ],
  },
  {
    title: "Precios",
    items: [
      { q: "¿Cuánto cuesta Wedge?", a: "El diagnóstico es gratis. El plan Free ($0) te deja ver tu situación; Pro ($99/mes, Acceso Fundador) prepara tu mes completo (CFDIs, ISR, IVA, pendientes, guía SAT, luk). Business está en lanzamiento privado." },
      { q: "¿Puedo cancelar cuando quiera?", a: "Sí. Cancelas desde tu cuenta en un clic y conservas el acceso hasta el final del periodo pagado." },
    ],
  },
  {
    title: "Seguridad",
    items: [
      { q: "¿Quién puede ver mi información?", a: "Solo tú. Toda tabla con tus datos usa Row Level Security en la base de datos; nadie del equipo accede a información individual." },
      { q: "¿Puedo borrar mi cuenta y mis datos?", a: "Sí, cuando quieras. Puedes ejercer tus derechos ARCO y eliminar tu cuenta completa; el borrado es real, no soft-delete." },
    ],
  },
  {
    title: "Contadores y validación",
    items: [
      { q: "¿Wedge sustituye a mi contador?", a: "No. Wedge prepara y ordena tu mes; tú o tu contador validan y presentan en SAT. Es una herramienta de preparación, no asesoría profesional." },
      { q: "¿Qué pasa si me equivoco al presentar?", a: "El SAT permite declaraciones complementarias. Si te pasa, luk te orienta sobre qué revisar; la corrección y el pago final los confirmas tú en SAT." },
    ],
  },
];

function faqJsonLd(): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: CATEGORIES.flatMap((c) =>
      c.items.map((qa) => ({
        "@type": "Question",
        name: qa.q,
        acceptedAnswer: { "@type": "Answer", text: qa.a },
      }))
    ),
  });
}

export default function FAQPage() {
  return (
    <PublicShell header={<PublicNav />} footer={<PublicFooter />} maxWidth={780}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd() }} />

      {/* ── Hero ── */}
      <section style={{ padding: `${wt.space[6]}px 0 ${wt.space[9]}px` }}>
        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>Centro de ayuda</div>
        <h1 style={{ ...wt.text.displayLg, color: wt.color.text, margin: 0 }}>Preguntas claras antes de empezar.</h1>
        <p style={{ ...wt.text.bodyLg, color: wt.color.textMuted, margin: `${wt.space[5]}px 0 0`, maxWidth: 640 }}>
          Resuelve dudas sobre diagnóstico, SAT, CFDIs, ISR, IVA, luk y cómo Wedge prepara tu Mes Fiscal.
        </p>
        <div style={{ display: "flex", gap: wt.space[4], flexWrap: "wrap", marginTop: wt.space[7] }}>
          <CtaLink href="/diagnostico" variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
            Hacer diagnóstico gratis
          </CtaLink>
          <CtaLink href="/soporte" variant="ghost" size="lg">Ver soporte</CtaLink>
        </div>
        <p style={{ ...wt.text.caption, color: wt.color.textMuted, marginTop: wt.space[4] }}>
          Sin conectar SAT · Sin tarjeta · Tú validas todo en SAT
        </p>
      </section>

      {/* ── Categorías ── */}
      {CATEGORIES.map((cat) => (
        <section key={cat.title} style={{ marginBottom: wt.space[8] }}>
          <h2 style={{ ...wt.text.h3, color: wt.color.text, margin: `0 0 ${wt.space[4]}px` }}>{cat.title}</h2>
          <div style={{ display: "grid", gap: wt.space[3] }}>
            {cat.items.map((qa, i) => (
              <details
                key={i}
                style={{
                  background: wt.color.surface,
                  border: `1px solid ${wt.color.border}`,
                  borderRadius: wt.radius.lg,
                  padding: `${wt.space[4]}px ${wt.space[5]}px`,
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    listStyle: "none",
                    ...wt.text.label,
                    color: wt.color.text,
                    outline: "none",
                  }}
                >
                  {qa.q}
                </summary>
                <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: `${wt.space[3]}px 0 0`, lineHeight: 1.6 }}>
                  {qa.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      ))}

      {/* ── Confianza ── */}
      <section style={{ marginBottom: wt.space[9] }}>
        <TrustPanel
          title="Wedge prepara; tú validas en SAT."
          description="Puedes empezar sin conectar SAT."
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

      {/* ── CTA final ── */}
      <section style={{ textAlign: "center", padding: `${wt.space[6]}px 0` }}>
        <h2 style={{ ...wt.text.h1, color: wt.color.text, margin: `0 0 ${wt.space[3]}px` }}>Empieza con diagnóstico gratis.</h2>
        <p style={{ ...wt.text.body, color: wt.color.textMuted, margin: `0 auto ${wt.space[7]}px`, maxWidth: 520 }}>
          ¿No encontraste tu duda? Escríbenos en{" "}
          <a href="/soporte" style={{ color: wt.color.orangeInk, textDecoration: "none", fontWeight: 560 }}>soporte</a>.
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <CtaLink href="/diagnostico" variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
            Hacer diagnóstico gratis
          </CtaLink>
        </div>
      </section>
    </PublicShell>
  );
}
