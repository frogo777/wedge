"use client";

/**
 * /soporte — migrada al Wedge Fiscal OS Design System (Fase 3B.3).
 *
 * Client component: conserva el FORM real (POST /api/soporte), el prefill de email
 * por sesión (Supabase) y el toast. Se reskina al DS, se añaden rutas de auto-ayuda
 * y el CTA principal va a /diagnostico. Copy de contacto honesto (sin "24/7" inventado).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { wt } from "@/design-system/tokens";
import { PublicShell, Card, TrustPanel, PermissionList, SecurityNotice } from "@/design-system";
import { PublicNav } from "@/app/_public/PublicNav";
import { PublicFooter } from "@/app/_public/PublicFooter";
import { CtaLink } from "@/app/_public/CtaLink";
import { useToast } from "@/app/_components/Toast";

const FONT = wt.font.sans;

type Motivo = "bug" | "pregunta" | "sugerencia" | "cancelacion";

const MOTIVO_OPTIONS: { id: Motivo; label: string }[] = [
  { id: "pregunta", label: "Pregunta" },
  { id: "bug", label: "Reportar bug" },
  { id: "sugerencia", label: "Sugerencia" },
  { id: "cancelacion", label: "Cancelación" },
];

// Rutas de auto-ayuda: cada duda lleva al recurso del flujo nuevo.
const HELP_ROUTES: { label: string; hint: string; href: string }[] = [
  { label: "No sé qué régimen uso", hint: "El diagnóstico te orienta sin pedir datos sensibles.", href: "/diagnostico" },
  { label: "Quiero revisar ISR o IVA", hint: "Usa las herramientas o haz tu diagnóstico completo.", href: "/diagnostico" },
  { label: "No quiero conectar SAT todavía", hint: "Puedes empezar sin SAT y usar XML/ZIP.", href: "/seguridad" },
  { label: "Tengo dudas de XML/ZIP", hint: "Cómo traer tus CFDIs y qué hace Wedge con ellos.", href: "/seguridad" },
  { label: "No entiendo un pendiente", hint: "luk explica qué revisar y por qué importa.", href: "/luk" },
  { label: "Quiero entender qué hace luk", hint: "Tu copiloto fiscal dentro de Wedge.", href: "/luk" },
];

const inputBase: React.CSSProperties = {
  width: "100%",
  background: wt.color.surface,
  border: `1px solid ${wt.color.border}`,
  borderRadius: wt.radius.md,
  padding: "0 14px",
  height: 46,
  color: wt.color.text,
  fontSize: 16,
  fontFamily: FONT,
  boxSizing: "border-box",
  outline: "none",
};

export default function SoportePage() {
  const [email, setEmail] = useState("");
  const [motivo, setMotivo] = useState<Motivo>("pregunta");
  const [mensaje, setMensaje] = useState("");
  const [submitting, setSub] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Prefill email si hay sesión.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!cancelled && user?.email) setEmail(user.email);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Necesitamos un email válido para responderte.");
      return;
    }
    if (mensaje.trim().length < 10) {
      setError("Cuéntanos un poco más (mínimo 10 caracteres).");
      return;
    }
    setSub(true);
    try {
      const r = await fetch("/api/soporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, motivo, mensaje }),
      });
      const data: { ok?: boolean; error?: string } = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        const msg = data.error || "No pudimos enviar tu mensaje. Vuelve a intentar.";
        setError(msg);
        toast.show({ kind: "error", title: "No se pudo enviar", message: msg });
        setSub(false);
        return;
      }
      setDone(true);
      toast.show({ kind: "success", title: "Mensaje enviado", message: "Te respondemos por correo lo antes posible." });
    } catch {
      const msg = "Error de red. Verifica tu conexión.";
      setError(msg);
      toast.show({ kind: "error", message: msg });
    } finally {
      setSub(false);
    }
  };

  return (
    <PublicShell header={<PublicNav />} footer={<PublicFooter />} maxWidth={780}>
      {/* ── Hero ── */}
      <section style={{ padding: `${wt.space[6]}px 0 ${wt.space[9]}px` }}>
        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>Soporte</div>
        <h1 style={{ ...wt.text.displayLg, color: wt.color.text, margin: 0 }}>Te ayudamos a avanzar sin perderte.</h1>
        <p style={{ ...wt.text.bodyLg, color: wt.color.textMuted, margin: `${wt.space[5]}px 0 0`, maxWidth: 620 }}>
          Encuentra ayuda para diagnóstico, CFDIs, SAT, tu cuenta y próximos pasos.
        </p>
        <div style={{ display: "flex", gap: wt.space[4], flexWrap: "wrap", marginTop: wt.space[7] }}>
          <CtaLink href="/diagnostico" variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
            Hacer diagnóstico gratis
          </CtaLink>
          <CtaLink href="/faq" variant="ghost" size="lg">Ver preguntas frecuentes</CtaLink>
        </div>
      </section>

      {/* ── Rutas de ayuda ── */}
      <section style={{ marginBottom: wt.space[9] }}>
        <h2 style={{ ...wt.text.h3, color: wt.color.text, margin: `0 0 ${wt.space[5]}px` }}>¿Con qué te ayudamos?</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: wt.space[4] }}>
          {HELP_ROUTES.map((r) => (
            <Link key={r.label + r.href} href={r.href} style={{ textDecoration: "none" }}>
              <Card variant="interactive" padding="default" style={{ height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: wt.space[3] }}>
                  <span style={{ ...wt.text.label, color: wt.color.text }}>{r.label}</span>
                  <ArrowRight size={15} color={wt.color.textMuted} style={{ flexShrink: 0 }} />
                </div>
                <p style={{ ...wt.text.bodySm, color: wt.color.textMuted, margin: `${wt.space[2]}px 0 0` }}>{r.hint}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Contacto (form real) ── */}
      <section style={{ marginBottom: wt.space[9] }}>
        <h2 style={{ ...wt.text.h3, color: wt.color.text, margin: `0 0 ${wt.space[2]}px` }}>¿Necesitas escribirnos?</h2>
        <p style={{ ...wt.text.bodySm, color: wt.color.textMuted, margin: `0 0 ${wt.space[5]}px` }}>
          Cuéntanos qué pasa con tu cuenta o tu mes. Te respondemos por correo lo antes posible.
        </p>

        {done ? (
          <Card variant="default" padding="comfortable">
            <div style={{ ...wt.text.label, color: wt.color.text, marginBottom: wt.space[2] }}>¡Mensaje recibido!</div>
            <p style={{ ...wt.text.bodySm, color: wt.color.textSecondary, margin: 0 }}>
              Te respondemos por correo lo antes posible a <strong style={{ color: wt.color.text }}>{email}</strong>.
            </p>
            <div style={{ marginTop: wt.space[5] }}>
              <CtaLink href="/diagnostico" variant="secondary" size="md" rightIcon={<ArrowRight size={15} />}>
                Mientras tanto, haz tu diagnóstico
              </CtaLink>
            </div>
          </Card>
        ) : (
          <Card variant="default" padding="comfortable">
            <form onSubmit={onSubmit}>
              <Field label="Tu email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required aria-label="Tu email" autoComplete="email" style={inputBase} />
              </Field>
              <Field label="Motivo">
                <select value={motivo} onChange={(e) => setMotivo(e.target.value as Motivo)} aria-label="Motivo del contacto" style={{ ...inputBase, appearance: "auto" }}>
                  {MOTIVO_OPTIONS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </Field>
              <Field label="Mensaje">
                <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Cuéntanos qué pasó, qué esperabas, y cualquier detalle útil…" rows={6} required aria-label="Mensaje" style={{ ...inputBase, height: "auto", padding: "12px 14px", resize: "vertical", minHeight: 120 }} />
              </Field>

              {error && (
                <div role="alert" style={{ marginTop: wt.space[3], padding: "10px 14px", borderRadius: wt.radius.md, background: wt.color.dangerBg, border: `1px solid rgba(216,92,74,0.30)`, ...wt.text.bodySm, color: wt.color.dangerInk }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: wt.space[5], width: "100%", height: 48,
                  background: submitting ? wt.color.borderStrong : wt.color.orange,
                  color: wt.color.textInverse, border: "none", borderRadius: wt.radius.md,
                  fontSize: 15, fontWeight: 560, fontFamily: FONT,
                  cursor: submitting ? "default" : "pointer",
                }}
              >
                {submitting ? "Enviando…" : "Enviar mensaje"}
              </button>

              <p style={{ ...wt.text.caption, color: wt.color.textMuted, textAlign: "center", marginTop: wt.space[4] }}>
                ¿Es algo urgente de seguridad? Escribe a{" "}
                <a href="mailto:seguridad@wedgemx.com" style={{ color: wt.color.orangeInk, textDecoration: "none", fontWeight: 560 }}>seguridad@wedgemx.com</a>.
              </p>
            </form>
          </Card>
        )}
      </section>

      {/* ── Trust ── */}
      <section style={{ marginBottom: wt.space[8] }}>
        <TrustPanel
          title="Qué esperar de Wedge"
          description="Wedge prepara; tú validas y presentas en SAT."
          footnote={<SecurityNotice>luk te ayuda a entender pendientes, pero tú validas en SAT.</SecurityNotice>}
        >
          <PermissionList
            items={[
              { allowed: false, label: "Wedge no presenta declaraciones ni paga impuestos por ti." },
              { allowed: true, label: "Puedes empezar sin conectar SAT." },
            ]}
          />
        </TrustPanel>
      </section>
    </PublicShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: wt.space[4], fontFamily: FONT }}>
      <div style={{ ...wt.text.label, color: wt.color.textSecondary, marginBottom: wt.space[3] }}>{label}</div>
      {children}
    </label>
  );
}
