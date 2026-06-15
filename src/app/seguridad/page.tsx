import type { Metadata } from "next";
import { ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { wt } from "@/design-system/tokens";
import {
  PublicShell, Card, TrustPanel, PermissionList, SecurityNotice,
} from "@/design-system";
import { PublicNav } from "@/app/_public/PublicNav";
import { PublicFooter } from "@/app/_public/PublicFooter";
import { CtaLink } from "@/app/_public/CtaLink";

/**
 * /seguridad — migrada al Wedge Fiscal OS Design System (Fase 3B.2).
 *
 * Objetivo: reducir el miedo ANTES de SAT/XML-ZIP/datos fiscales. Seguridad como
 * UX (no muro legal): qué sí / qué no, alternativas, control y reversibilidad.
 * Server component → conserva `metadata`. Se preservan los hechos técnicos reales
 * (TLS, AES-256, RLS, ARCO/LFPDPPP, borrado real, incidentes) en lenguaje humano.
 */
export const metadata: Metadata = {
  title: "Seguridad",
  description:
    "Tus datos fiscales, bajo tu control. Wedge organiza tu mes sin presentar, pagar ni modificar información en SAT: cifrado AES-256, aislamiento por usuario (RLS), alternativa XML/ZIP y borrado real.",
  alternates: { canonical: "/seguridad" },
};

const TECH: { title: string; body: string }[] = [
  { title: "Cifrado en tránsito y en reposo", body: "Todo el tráfico va por TLS 1.3 con HSTS. La base de datos (Supabase/PostgreSQL) y los backups se cifran con AES-256." },
  { title: "Credenciales SAT de vida corta", body: "Si decides conectar tu SAT, la CIEC se cifra con una llave por usuario y solo se descifra en memoria durante la consulta. No dejamos sesiones SAT abiertas en segundo plano." },
  { title: "Aislamiento por usuario (RLS)", body: "Cada tabla con tus datos usa Row Level Security: solo tú lees y escribes tus filas. Lo valida la base de datos, no solo el código." },
  { title: "Secretos solo en el servidor", body: "Las llaves de SAT, pagos y APIs viven en variables de entorno del servidor. Nunca llegan al navegador ni a la app." },
  { title: "Borrado real, no soft-delete", body: "Cuando eliminas tu cuenta, tus filas se borran en cascada. Solo queda un registro anonimizado para auditoría, sin email, RFC ni dato identificable." },
  { title: "Sin venta ni compartición de datos", body: "No vendemos tu información ni la compartimos con anunciantes. Los proveedores de infraestructura son procesadores estrictos bajo contrato." },
];

const FAQ: { q: string; a: string }[] = [
  { q: "¿Necesito CIEC o e.firma para empezar?", a: "No. Puedes hacer tu diagnóstico y preparar tu mes sin conectar SAT. La CIEC solo se pide, con tu consentimiento, si más adelante quieres descarga automática de CFDIs." },
  { q: "¿Puedo usar XML/ZIP en lugar de conectar?", a: "Sí. Puedes subir tus CFDIs como XML o ZIP y preparar tu mes completo sin compartir credenciales del SAT." },
  { q: "¿Wedge presenta mi declaración?", a: "No. Wedge prepara tu información; tú validas y presentas en SAT. No declara, no paga ni modifica nada en el SAT." },
  { q: "¿Puedo borrar mis datos?", a: "Sí, cuando quieras. Puedes ejercer tus derechos ARCO y exportar o eliminar tu cuenta completa desde Configuración → Datos y privacidad." },
  { q: "¿Qué pasa si no conecto SAT?", a: "Wedge sigue funcionando: diagnóstico, XML/ZIP y tu Mes Fiscal. Conectar el SAT es opcional y reversible en cualquier momento." },
];

export default function SeguridadPage() {
  return (
    <PublicShell header={<PublicNav />} footer={<PublicFooter />} maxWidth={780}>
      {/* ── Hero ── */}
      <section style={{ padding: `${wt.space[6]}px 0 ${wt.space[9]}px` }}>
        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>
          Seguridad y control
        </div>
        <h1 style={{ ...wt.text.displayLg, color: wt.color.text, margin: 0 }}>
          Tus datos fiscales, bajo tu control.
        </h1>
        <p style={{ ...wt.text.bodyLg, color: wt.color.textMuted, margin: `${wt.space[5]}px 0 0`, maxWidth: 620 }}>
          Wedge puede ayudarte a organizar tu mes fiscal sin presentar, pagar ni modificar información en SAT.
        </p>
        <div style={{ display: "flex", gap: wt.space[4], flexWrap: "wrap", marginTop: wt.space[7] }}>
          <CtaLink href="/diagnostico" variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
            Hacer diagnóstico sin conectar SAT
          </CtaLink>
        </div>
      </section>

      {/* ── Qué sí / qué no ── */}
      <section style={{ marginBottom: wt.space[9] }}>
        <TrustPanel
          title="Qué hace Wedge con tus datos — y qué no"
          description="Wedge prepara; tú validas y presentas en SAT."
          footnote={<SecurityNotice>Cifrado por usuario · no compartimos tus datos.</SecurityNotice>}
        >
          <PermissionList
            items={[
              { allowed: true,  label: "Organiza tus CFDIs y tu mes fiscal." },
              { allowed: true,  label: "Lee la información fiscal que tú autorices." },
              { allowed: true,  label: "Te ayuda a detectar pendientes." },
              { allowed: true,  label: "Prepara tu guía para validar en SAT." },
              { allowed: false, label: "No declara ni presenta por ti." },
              { allowed: false, label: "No paga impuestos." },
              { allowed: false, label: "No cancela CFDIs ni modifica información en SAT." },
              { allowed: false, label: "No sustituye la validación de un profesional." },
            ]}
          />
        </TrustPanel>
      </section>

      {/* ── Alternativas (consent preview, sin pedir nada) ── */}
      <section style={{ marginBottom: wt.space[9] }}>
        <Card variant="default" padding="comfortable">
          <h2 style={{ ...wt.text.h2, color: wt.color.text, margin: 0 }}>Puedes usar Wedge sin conectar SAT</h2>
          <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: `${wt.space[3]}px 0 ${wt.space[5]}px` }}>
            Conectar el SAT es opcional. Tienes tres caminos, tú eliges:
          </p>
          <PermissionList
            items={[
              { allowed: true, label: "Diagnóstico inicial sin cuenta ni datos sensibles." },
              { allowed: true, label: "Subir tus CFDIs por XML/ZIP." },
              { allowed: true, label: "Conectar SAT más adelante, con tu consentimiento." },
            ]}
          />
          <div style={{ marginTop: wt.space[6] }}>
            <CtaLink href="/diagnostico" variant="secondary" size="md" rightIcon={<ArrowRight size={15} />}>
              Empezar con diagnóstico
            </CtaLink>
          </div>
        </Card>
      </section>

      {/* ── Control del usuario ── */}
      <section style={{ marginBottom: wt.space[9] }}>
        <Card variant="trust" padding="comfortable">
          <div style={{ display: "flex", alignItems: "center", gap: wt.space[3], marginBottom: wt.space[5] }}>
            <span aria-hidden style={{ display: "inline-flex", color: wt.color.trustBlueGray }}><ShieldCheck size={20} /></span>
            <h2 style={{ ...wt.text.h3, color: wt.color.text, margin: 0 }}>Siempre tienes el control</h2>
          </div>
          <PermissionList
            items={[
              { allowed: true, label: "Desconectar el SAT cuando quieras." },
              { allowed: true, label: "Borrar tus datos o tu cuenta completa." },
              { allowed: true, label: "Continuar sin SAT con XML/ZIP." },
              { allowed: true, label: "Revisar todo antes de validar en SAT." },
            ]}
          />
        </Card>
      </section>

      {/* ── Detalle técnico (para quien lo quiere) ── */}
      <section style={{ marginBottom: wt.space[9] }}>
        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[2] }}>Detalle técnico</div>
        <h2 style={{ ...wt.text.h2, color: wt.color.text, margin: `0 0 ${wt.space[6]}px` }}>Cómo cuidamos tu información</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: wt.space[4] }}>
          {TECH.map((c, i) => (
            <Card key={i} variant="default" padding="default">
              <div style={{ display: "flex", alignItems: "center", gap: wt.space[3], marginBottom: wt.space[3] }}>
                <span aria-hidden style={{ display: "inline-flex", color: wt.color.trustBlueGray }}><Lock size={16} /></span>
                <span style={{ ...wt.text.label, color: wt.color.text }}>{c.title}</span>
              </div>
              <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: 0, lineHeight: 1.6 }}>{c.body}</p>
            </Card>
          ))}
        </div>
        <p style={{ ...wt.text.caption, color: wt.color.textMuted, marginTop: wt.space[5] }}>
          Wedge cumple con la Ley Federal de Protección de Datos Personales (LFPDPPP). Última actualización del documento: abril 2026.
        </p>
      </section>

      {/* ── FAQ de seguridad ── */}
      <section style={{ marginBottom: wt.space[9] }}>
        <h2 style={{ ...wt.text.h2, color: wt.color.text, margin: `0 0 ${wt.space[6]}px` }}>Preguntas de seguridad</h2>
        <div style={{ display: "grid", gap: wt.space[4] }}>
          {FAQ.map((it, i) => (
            <Card key={i} variant="quiet" padding="default">
              <div style={{ ...wt.text.label, color: wt.color.text, marginBottom: wt.space[3] }}>{it.q}</div>
              <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: 0, lineHeight: 1.6 }}>{it.a}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Reportar + CTA final ── */}
      <section style={{ textAlign: "center", padding: `${wt.space[6]}px 0` }}>
        <p style={{ ...wt.text.bodySm, color: wt.color.textMuted, margin: `0 0 ${wt.space[6]}px` }}>
          ¿Encontraste un problema de seguridad? Escríbenos a{" "}
          <a href="mailto:seguridad@wedgemx.com" style={{ color: wt.color.orangeInk, textDecoration: "none", fontWeight: 560 }}>
            seguridad@wedgemx.com
          </a>. Respondemos en menos de 48 horas hábiles.
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <CtaLink href="/diagnostico" variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
            Hacer diagnóstico sin conectar SAT
          </CtaLink>
        </div>
      </section>
    </PublicShell>
  );
}
