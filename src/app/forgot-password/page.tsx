"use client";

/**
 * /forgot-password — DS dark. Envía el enlace de recuperación de Supabase a
 * `${origin}/auth/callback?next=/reset-password` (canjea el code PKCE y deja la
 * sesión de recovery lista antes de /reset-password). Lógica auth intacta.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { wt } from "@/design-system/tokens";
import { Button, Card, LogoLockup, SecurityNotice } from "@/design-system";

const FONT = wt.font.sans;

const inputBase: React.CSSProperties = {
  width: "100%", background: wt.color.surface, border: `1px solid ${wt.color.border}`,
  borderRadius: wt.radius.md, padding: "0 14px", height: 46, color: wt.color.text,
  fontSize: 16, fontFamily: FONT, boxSizing: "border-box", outline: "none",
};

export default function ForgotPassword() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    setError("");
    setLoading(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error: err } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });
    if (err) {
      setError("No pudimos enviar el correo. Intenta de nuevo en un momento.");
      setLoading(false);
    } else {
      setDone(true);
    }
  };

  return (
    <div className="wds-root" style={{ minHeight: "100svh", background: wt.color.bgPrimary, color: wt.color.text, fontFamily: FONT, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ marginBottom: wt.space[7] }}>
          <Link href="/" aria-label="Wedge — inicio" style={{ display: "inline-flex", textDecoration: "none" }}>
            <LogoLockup variant="horizontal" tone="dark" size="md" />
          </Link>
        </div>

        {done ? (
          <Card variant="default" padding="comfortable">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: wt.color.successBg, color: wt.color.success, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Mail size={22} />
              </div>
              <div style={{ ...wt.text.label, color: wt.color.text }}>Revisa tu correo</div>
              <div style={{ ...wt.text.bodySm, color: wt.color.textMuted, lineHeight: 1.5 }}>
                Enviamos un enlace a <strong style={{ color: wt.color.text }}>{email}</strong> para restablecer tu contraseña. Revisa también spam.
              </div>
              {/* R8: honesto — si el correo automático no llega (modo sin costo), ruta de recuperación manual. */}
              <div style={{ ...wt.text.caption, color: wt.color.textMuted, lineHeight: 1.5 }}>
                ¿No te llega en unos minutos? Escríbenos a{" "}
                <a href="mailto:hola@wedgemx.com" style={{ color: wt.color.orange, textDecoration: "none" }}>hola@wedgemx.com</a>
                {" "}y te ayudamos a recuperar tu acceso.
              </div>
              <Button variant="secondary" onClick={() => router.push("/login")} leftIcon={<ArrowLeft size={16} />}>Volver a iniciar sesión</Button>
            </div>
          </Card>
        ) : (
          <>
            <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>Recuperar acceso</div>
            <h1 style={{ ...wt.text.h1, color: wt.color.text, margin: 0 }}>Recuperar contraseña.</h1>
            <p style={{ ...wt.text.body, color: wt.color.textMuted, margin: `${wt.space[3]}px 0 0` }}>
              Escribe tu correo y te enviamos un enlace para restablecerla.
            </p>
            <Card variant="default" padding="comfortable" style={{ marginTop: wt.space[7] }}>
              <form onSubmit={handleSubmit}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required autoFocus aria-label="Correo electrónico" autoComplete="email" inputMode="email" style={{ ...inputBase, marginBottom: 14 }} />
                {error && (
                  <div role="alert" style={{ background: wt.color.dangerBg, border: `1px solid rgba(216,92,74,0.30)`, borderRadius: wt.radius.md, padding: "10px 14px", ...wt.text.bodySm, color: wt.color.dangerInk, marginBottom: 14 }}>{error}</div>
                )}
                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} disabled={!email.trim()} leftIcon={<Mail size={16} />}>
                  {loading ? "Enviando…" : "Enviar enlace de recuperación"}
                </Button>
              </form>
            </Card>
            <div style={{ display: "flex", justifyContent: "center", marginTop: wt.space[6] }}>
              <SecurityNotice>Wedge prepara; tú validas y presentas en SAT.</SecurityNotice>
            </div>
            <p style={{ textAlign: "center", ...wt.text.body, color: wt.color.textMuted, marginTop: wt.space[5] }}>
              <Link href="/login" style={{ color: wt.color.orange, textDecoration: "none", fontWeight: 560 }}>← Volver a iniciar sesión</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
