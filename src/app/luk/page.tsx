import type { Metadata } from "next";
import { ArrowRight, FileText, Receipt, Coins, CheckCircle2 } from "lucide-react";
import { wt } from "@/design-system/tokens";
import {
  PublicShell, Card, ActionCard, TrustPanel, PermissionList, SecurityNotice, Badge,
} from "@/design-system";
import { PublicNav } from "@/app/_public/PublicNav";
import { PublicFooter } from "@/app/_public/PublicFooter";
import { CtaLink } from "@/app/_public/CtaLink";

/**
 * /luk — migrada al Wedge Fiscal OS Design System (Fase 3B.2).
 *
 * luk = copiloto CONTEXTUAL dentro de Wedge (no chatbot genérico, no "contador IA",
 * no mascota, no "IA mágica"). Explica pendientes/CFDIs/IVA/retenciones y la próxima
 * acción; nunca declara, paga ni decide por ti. Server component → SEO con metadata.
 */
export const metadata: Metadata = {
  title: "luk — tu copiloto fiscal",
  description:
    "luk detecta lo que falta antes de que se vuelva problema: un copiloto contextual dentro de Wedge que explica pendientes, CFDIs, IVA, retenciones y tu próxima acción. No presenta declaraciones; tú validas en SAT.",
  alternates: { canonical: "/luk" },
};

// Insights reales de luk (ilustrativos, sin acción — no es un chat).
const INSIGHTS: { area: string; icon: React.ReactNode; insight: string; why: string }[] = [
  {
    area: "CFDI",
    icon: <FileText size={16} />,
    insight: "Este CFDI cancelado no debería impactar tu cálculo.",
    why: "luk revisa el estado del comprobante y lo excluye con una nota, para que tu ISR e IVA no se inflen.",
  },
  {
    area: "IVA",
    icon: <Receipt size={16} />,
    insight: "Estos gastos podrían cambiar tu IVA acreditable.",
    why: "Detecta gastos con CFDI que aún no consideras y te dice cuánto IVA podrías acreditar este mes.",
  },
  {
    area: "Retenciones",
    icon: <Coins size={16} />,
    insight: "Falta validar una retención.",
    why: "Cuando un cliente persona moral te retiene ISR o IVA, luk te avisa para que no pagues de más.",
  },
  {
    area: "Mes Fiscal",
    icon: <CheckCircle2 size={16} />,
    insight: "Tu mes está listo para validar en SAT.",
    why: "Cuando no quedan pendientes, luk te lo dice con claridad: tú validas y presentas en SAT.",
  },
];

const WHERE: string[] = [
  "Mes Fiscal", "CFDIs", "ISR", "IVA", "Retenciones", "Guía SAT", "Errores de conexión",
];

export default function LukPage() {
  return (
    <PublicShell header={<PublicNav />} footer={<PublicFooter />} maxWidth={900}>
      {/* ── Hero ── */}
      <section style={{ maxWidth: 720, padding: `${wt.space[6]}px 0 ${wt.space[10]}px` }}>
        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>
          Copiloto contextual
        </div>
        <h1 style={{ ...wt.text.displayLg, color: wt.color.text, margin: 0 }}>
          luk detecta lo que falta antes de que se vuelva problema.
        </h1>
        <p style={{ ...wt.text.bodyLg, color: wt.color.textMuted, margin: `${wt.space[5]}px 0 0`, maxWidth: 620 }}>
          Un copiloto contextual dentro de Wedge para explicar pendientes, CFDIs, IVA, retenciones y tu próxima acción.
        </p>
        <div style={{ display: "flex", gap: wt.space[4], flexWrap: "wrap", marginTop: wt.space[7] }}>
          <CtaLink href="/diagnostico" variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
            Hacer diagnóstico gratis
          </CtaLink>
        </div>
        <p style={{ ...wt.text.caption, color: wt.color.textMuted, marginTop: wt.space[4] }}>
          luk no presenta declaraciones. Te ayuda a entender qué revisar.
        </p>
      </section>

      {/* ── Qué hace luk (insights reales) ── */}
      <section style={{ marginBottom: wt.space[10] }}>
        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[2] }}>Qué hace luk</div>
        <h2 style={{ ...wt.text.h2, color: wt.color.text, margin: `0 0 ${wt.space[3]}px` }}>
          Insights accionables, no un chat genérico
        </h2>
        <p style={{ ...wt.text.body, color: wt.color.textMuted, margin: `0 0 ${wt.space[7]}px`, maxWidth: 620 }}>
          luk lee tu mes y te dice, en lenguaje claro, qué revisar y por qué importa.
        </p>
        <div style={{ display: "grid", gap: wt.space[4] }}>
          {INSIGHTS.map((it, i) => (
            <ActionCard
              key={i}
              variant="neutral"
              overline={it.area}
              icon={it.icon}
              title={it.insight}
              description={it.why}
            />
          ))}
        </div>
      </section>

      {/* ── Dónde aparece ── */}
      <section style={{ marginBottom: wt.space[10] }}>
        <Card variant="quiet" padding="comfortable">
          <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[2] }}>Dónde aparece</div>
          <h2 style={{ ...wt.text.h3, color: wt.color.text, margin: `0 0 ${wt.space[5]}px` }}>
            luk vive donde lo necesitas, no en una ventana aparte
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: wt.space[3] }}>
            {WHERE.map((w) => (
              <Badge key={w} variant="outline" size="md">{w}</Badge>
            ))}
          </div>
        </Card>
      </section>

      {/* ── Qué no es ── */}
      <section style={{ marginBottom: wt.space[10], maxWidth: 720 }}>
        <TrustPanel
          title="Qué no es luk"
          description="Wedge prepara; tú validas y presentas en SAT."
          footnote={<SecurityNotice>Tus datos solo se usan para ayudarte con tu mes — cifrados y solo para ti.</SecurityNotice>}
        >
          <PermissionList
            items={[
              { allowed: false, label: "No es un contador ni sustituye la validación profesional." },
              { allowed: false, label: "No declara ni presenta por ti." },
              { allowed: false, label: "No paga impuestos." },
              { allowed: false, label: "No toma decisiones fiscales por ti." },
            ]}
          />
        </TrustPanel>
      </section>

      {/* ── CTA final ── */}
      <section style={{ textAlign: "center", padding: `${wt.space[6]}px 0` }}>
        <h2 style={{ ...wt.text.h1, color: wt.color.text, margin: `0 0 ${wt.space[3]}px` }}>
          Empieza con diagnóstico gratis.
        </h2>
        <p style={{ ...wt.text.body, color: wt.color.textMuted, margin: `0 auto ${wt.space[7]}px`, maxWidth: 520 }}>
          Haz tu diagnóstico y deja que luk te muestre qué revisar antes del día 17.
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
