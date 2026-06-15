"use client";

/**
 * Home pública de Wedge (Fase 3A) — entrada al Fiscal OS.
 *
 * Dark warm-graphite, Design System aprobado (@/design-system). NO usa el
 * sistema visual legacy. Lleva a UNA acción: hacer diagnóstico gratis.
 * Claridad legal: Wedge prepara; el usuario valida y presenta en el SAT.
 */
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { wt } from "@/design-system/tokens";
import {
  PublicShell, Button, Card, TrustPanel, PermissionList, SecurityNotice,
  TimelineStep, StatusChip,
} from "@/design-system";
import { PublicNav } from "@/app/_public/PublicNav";
import { PublicFooter } from "@/app/_public/PublicFooter";
import { MesFiscalDemo } from "@/app/_public/MesFiscalDemo";
import {
  Calculator, FileSearch, FileCheck2, ShieldOff, CheckCircle2, ListChecks,
  ArrowRight, AlertTriangle, ReceiptText, Sparkles,
} from "lucide-react";

function Sec({ id, children, style }: { id?: string; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <section id={id} style={{ maxWidth: wt.maxWidth.app, margin: "0 auto", padding: `${wt.space[12]}px ${wt.space[6]}px`, ...style }}>
      {children}
    </section>
  );
}
function Kicker({ children }: { children: string }) {
  return <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>{children}</div>;
}
function H2({ children }: { children: ReactNode }) {
  return <h2 style={{ ...wt.text.h2, color: wt.color.text, margin: 0, maxWidth: 720 }}>{children}</h2>;
}
function Lead({ children }: { children: ReactNode }) {
  return <p style={{ ...wt.text.bodyLg, color: wt.color.textSecondary, margin: `${wt.space[4]}px 0 0`, maxWidth: 640 }}>{children}</p>;
}

export default function Home() {
  const router = useRouter();
  const goDiag = () => router.push("/diagnostico");
  const scrollDemo = () => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <PublicShell header={<PublicNav />} footer={<PublicFooter />} maxWidth={1280}>

      {/* ───────── 1. HERO ───────── */}
      <Sec style={{ paddingTop: wt.space[12], paddingBottom: wt.space[10] }}>
        <div className="wds-cols-2">
          <div>
            <span style={{ ...wt.text.micro, color: wt.color.textMuted }}>Fiscal OS · freelancers y personas físicas MX</span>
            <h1 style={{ ...wt.text.displayLg, color: wt.color.text, margin: `${wt.space[4]}px 0 0`, letterSpacing: "-0.03em" }}>
              Tu mes fiscal, claro antes del día 17.
            </h1>
            <p style={{ ...wt.text.bodyLg, color: wt.color.textSecondary, margin: `${wt.space[5]}px 0 0`, maxWidth: 520 }}>
              Wedge convierte tus CFDIs en ISR, IVA, pendientes y una próxima acción antes de validar en SAT.
            </p>
            <div style={{ display: "flex", gap: wt.space[4], flexWrap: "wrap", marginTop: wt.space[7] }}>
              <Button variant="primary" size="lg" onClick={goDiag} rightIcon={<ArrowRight size={18} />}>Hacer diagnóstico gratis</Button>
              <Button variant="secondary" size="lg" onClick={scrollDemo}>Ver demo con datos ficticios</Button>
            </div>
            <p style={{ ...wt.text.caption, color: wt.color.textMuted, marginTop: wt.space[5] }}>
              Sin conectar SAT · Sin tarjeta · Tú validas todo en SAT
            </p>
          </div>
          <div id="demo">
            <MesFiscalDemo />
          </div>
        </div>
      </Sec>

      {/* ───────── 2. QUÉ NECESITAS RESOLVER HOY ───────── */}
      <Sec>
        <Kicker>Qué necesitas resolver hoy</Kicker>
        <H2>Llegas con una de estas dudas. Wedge te lleva a la siguiente acción.</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: wt.space[4], marginTop: wt.space[6] }}>
          {[
            { icon: <Calculator size={18} />, title: "No sé cuánto pagar", desc: "Estima tu ISR e IVA del mes en 2 minutos, sin conectar nada.", cta: "Hacer diagnóstico", onClick: goDiag },
            { icon: <FileSearch size={18} />, title: "Quiero revisar mis CFDIs", desc: "Wedge los ordena y te dice cuáles impactan tu cálculo.", cta: "Ver demo", onClick: scrollDemo },
            { icon: <FileCheck2 size={18} />, title: "Quiero preparar mi declaración", desc: "Te deja todo listo para validar y presentar tú en el SAT.", cta: "Hacer diagnóstico", onClick: goDiag },
            { icon: <ShieldOff size={18} />, title: "No quiero conectar SAT todavía", desc: "Empieza con tus XML/ZIP o solo con tu diagnóstico. Tú decides cuándo conectar.", cta: "Empezar sin SAT", onClick: goDiag },
          ].map((p) => (
            <Card key={p.title} variant="default" style={{ display: "flex", flexDirection: "column", gap: wt.space[3] }}>
              <span style={{ display: "inline-flex", width: 34, height: 34, borderRadius: wt.radius.md, background: wt.color.surface2, color: wt.color.textSecondary, alignItems: "center", justifyContent: "center" }}>{p.icon}</span>
              <div style={{ ...wt.text.h3, color: wt.color.text }}>{p.title}</div>
              <p style={{ ...wt.text.bodySm, color: wt.color.textMuted, margin: 0, flex: 1 }}>{p.desc}</p>
              <button onClick={p.onClick} style={{ ...wt.text.label, color: wt.color.orangeInk, background: "none", border: "none", padding: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
                {p.cta} <ArrowRight size={14} />
              </button>
            </Card>
          ))}
        </div>
      </Sec>

      {/* ───────── 3. MES FISCAL ───────── */}
      <Sec>
        <div className="wds-cols-2">
          <div>
            <Kicker>El Mes Fiscal</Kicker>
            <H2>Wedge no te muestra datos sueltos. Convierte tu mes en una ruta.</H2>
            <Lead>Una sola pregunta con respuesta clara: esto está listo, esto falta, esto sigue. Sin tablas frías ni terminología del portal del SAT.</Lead>
          </div>
          <Card variant="quiet" padding="comfortable" style={{ display: "grid", gap: wt.space[5] }}>
            <RutaRow chip={<StatusChip status="confirmado" size="sm" />} title="Esto está listo" desc="Ingresos confirmados y CFDIs ordenados." />
            <RutaRow chip={<StatusChip status="requiereRevision" size="sm" />} title="Esto falta" desc="3 pendientes antes del día 17: IVA, una retención y 2 ingresos." />
            <RutaRow chip={<StatusChip status="listoValidar" size="sm" />} title="Esto sigue" desc="Listo para validar y presentar tú en el SAT." />
          </Card>
        </div>
      </Sec>

      {/* ───────── 4. CÓMO FUNCIONA ───────── */}
      <Sec id="como-funciona">
        <Kicker>Cómo funciona</Kicker>
        <H2>Cinco pasos, a tu ritmo.</H2>
        <Card variant="quiet" padding="comfortable" style={{ marginTop: wt.space[6], maxWidth: 720 }}>
          <TimelineStep state="current" title="Haces tu diagnóstico" description="5 preguntas, sin cuenta. Obtienes un estimado al instante." />
          <TimelineStep state="upcoming" title="Subes XML/ZIP o conectas SAT después" description="Cuando quieras. Puedes empezar sin conectar nada." />
          <TimelineStep state="upcoming" title="Wedge ordena tus CFDIs" description="Detecta ingresos, gastos, retenciones y lo que impacta tu cálculo." />
          <TimelineStep state="upcoming" title="Revisas pendientes" description="Confirmas ingresos, revisas IVA, validas retenciones." />
          <TimelineStep state="upcoming" title="Validas y presentas en SAT" description="Wedge te deja todo listo; tú validas y presentas con tu e.firma." last />
        </Card>
      </Sec>

      {/* ───────── 5. SEGURIDAD / SAT ───────── */}
      <Sec id="seguridad">
        <Kicker>Seguridad y SAT</Kicker>
        <H2>Puedes usar Wedge sin conectar SAT. Si conectas, tú mandas.</H2>
        <div style={{ marginTop: wt.space[6], maxWidth: 720 }}>
          <TrustPanel
            title="Qué hace Wedge con tu SAT (y qué no)"
            description="Si conectas, Wedge consulta tus CFDIs para armar tu mes fiscal. Wedge prepara; tú validas y presentas en SAT."
            footnote={<SecurityNotice>Tus credenciales se cifran (AES-256) por usuario y puedes desconectar cuando quieras.</SecurityNotice>}
          >
            <PermissionList
              items={[
                { allowed: true, label: "Lee tus CFDIs emitidos y recibidos para armar tu mes." },
                { allowed: true, label: "Lee tu situación fiscal y tu Buzón (si conectas)." },
                { allowed: false, label: "No declara, no paga ni modifica nada en el SAT." },
                { allowed: false, label: "No comparte tus datos con terceros." },
              ]}
            />
          </TrustPanel>
        </div>
      </Sec>

      {/* ───────── 6. LUK ───────── */}
      <Sec>
        <div className="wds-cols-2">
          <div>
            <Kicker>luk · tu copiloto</Kicker>
            <H2>luk detecta lo que falta antes de que se vuelva problema.</H2>
            <Lead>No es un chatbot que espera tu pregunta. Es un copiloto contextual que revisa tu mes y te avisa qué atender.</Lead>
          </div>
          <Card variant="quiet" padding="comfortable" style={{ display: "grid", gap: wt.space[3] }}>
            {[
              { icon: <AlertTriangle size={16} />, c: wt.color.warningInk, t: "Detecté un CFDI cancelado que aún cuenta en tu cálculo." },
              { icon: <ReceiptText size={16} />, c: wt.color.infoInk, t: "Tienes IVA por revisar: 3 gastos sin medio de pago bancarizado." },
              { icon: <ListChecks size={16} />, c: wt.color.infoInk, t: "Falta validar una retención de cliente persona moral." },
              { icon: <Sparkles size={16} />, c: wt.color.orangeInk, t: "Tu próxima acción: confirmar 2 ingresos cobrados." },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", gap: wt.space[3], alignItems: "flex-start" }}>
                <span style={{ color: row.c, display: "inline-flex", flexShrink: 0, marginTop: 1 }}>{row.icon}</span>
                <span style={{ ...wt.text.bodySm, color: wt.color.textSecondary }}>{row.t}</span>
              </div>
            ))}
          </Card>
        </div>
      </Sec>

      {/* ───────── 7. FAQ CRÍTICA ───────── */}
      <Sec>
        <Kicker>Preguntas que importan</Kicker>
        <H2>Lo esencial, claro.</H2>
        <div style={{ marginTop: wt.space[6], maxWidth: 760, display: "grid", gap: wt.space[3] }}>
          {FAQ.map((f) => (
            <details key={f.q} style={{ background: wt.color.surface, border: `1px solid ${wt.color.border}`, borderRadius: wt.radius.lg, padding: `${wt.space[4]}px ${wt.space[5]}px` }}>
              <summary style={{ ...wt.text.label, color: wt.color.text, cursor: "pointer" }}>{f.q}</summary>
              <p style={{ ...wt.text.bodySm, color: wt.color.textMuted, margin: `${wt.space[3]}px 0 0` }}>{f.a}</p>
            </details>
          ))}
        </div>
      </Sec>

      {/* ───────── 8. CTA FINAL ───────── */}
      <Sec style={{ paddingBottom: wt.space[16] }}>
        <Card variant="hero" padding="comfortable" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: wt.space[5] }}>
          <CheckCircle2 size={28} color={wt.color.orangeInk} />
          <h2 style={{ ...wt.text.h1, color: wt.color.text, margin: 0, maxWidth: 560 }}>Empieza con un diagnóstico gratis.</h2>
          <p style={{ ...wt.text.bodyLg, color: wt.color.textSecondary, margin: 0, maxWidth: 520 }}>
            Sabrás cuánto pagar de ISR e IVA, qué te falta y qué sigue — antes del día 17.
          </p>
          <Button variant="primary" size="lg" onClick={goDiag} rightIcon={<ArrowRight size={18} />}>Hacer diagnóstico gratis</Button>
          <p style={{ ...wt.text.caption, color: wt.color.textMuted, margin: 0 }}>
            Sin conectar SAT · Sin tarjeta · Toma menos de 2 minutos
          </p>
        </Card>
      </Sec>
    </PublicShell>
  );
}

function RutaRow({ chip, title, desc }: { chip: ReactNode; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", gap: wt.space[4], alignItems: "flex-start" }}>
      <div style={{ flexShrink: 0, marginTop: 2 }}>{chip}</div>
      <div>
        <div style={{ ...wt.text.label, color: wt.color.text }}>{title}</div>
        <div style={{ ...wt.text.bodySm, color: wt.color.textMuted, marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
}

const FAQ: { q: string; a: string }[] = [
  { q: "¿Wedge presenta mi declaración?", a: "No. Wedge prepara y ordena tu mes fiscal (cálculo informativo). Tú validas y presentas en el SAT con tu e.firma. Wedge no declara, no paga ni modifica nada en el SAT." },
  { q: "¿Necesito conectar mi SAT?", a: "No es obligatorio. Puedes empezar con tu diagnóstico y subir tus XML/ZIP. Si decides conectar, Wedge solo consulta tus CFDIs para armar tu mes." },
  { q: "¿Puedo usar XML/ZIP?", a: "Sí. Puedes traer tus CFDIs subiendo el XML o el ZIP que descargas del SAT, sin compartir credenciales." },
  { q: "¿luk sustituye a un contador?", a: "No. luk es un copiloto que te orienta y te avisa qué falta. No es asesoría fiscal ni reemplaza a un profesional cuando lo necesitas." },
  { q: "¿Qué regímenes soporta?", a: "Hoy: RESICO PF y Honorarios / Actividad Profesional. Es lo que la mayoría de freelancers y personas físicas independientes necesitan." },
  { q: "¿Puedo borrar mis datos?", a: "Sí. Puedes solicitar la eliminación de tus datos cuando quieras (derechos ARCO, LFPDPPP). El diagnóstico no guarda nada hasta que decides crear tu cuenta." },
];
