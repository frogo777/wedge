"use client";

/**
 * /reset-password — DS dark. Requiere sesión de recovery (la deja /auth/callback
 * tras canjear el code del enlace de forgot-password). `updateUser({password})`
 * y redirige al Mes Fiscal. Lógica auth intacta.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { wt } from "@/design-system/tokens";
import { Button, Card, LogoLockup } from "@/design-system";

const FONT = wt.font.sans;

const inputBase: React.CSSProperties = {
  width: "100%", background: wt.color.surface, border: `1px solid ${wt.color.border}`,
  borderRadius: wt.radius.md, padding: "0 14px", height: 46, color: wt.color.text,
  fontSize: 16, fontFamily: FONT, boxSizing: "border-box", outline: "none",
};

export default function ResetPassword() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const valid = password.length >= 8 && password === password2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError("No pudimos actualizar tu contraseña. El enlace puede haber expirado — solicita uno nuevo.");
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.push("/app/mes"), 1800);
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
                <CheckCircle size={22} />
              </div>
              <div style={{ ...wt.text.label, color: wt.color.text }}>Contraseña actualizada</div>
              <div style={{ ...wt.text.bodySm, color: wt.color.textMuted }}>Te llevamos a tu Mes Fiscal…</div>
            </div>
          </Card>
        ) : (
          <>
            <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>Nueva contraseña</div>
            <h1 style={{ ...wt.text.h1, color: wt.color.text, margin: 0 }}>Elige tu nueva contraseña.</h1>
            <p style={{ ...wt.text.body, color: wt.color.textMuted, margin: `${wt.space[3]}px 0 0` }}>Mínimo 8 caracteres.</p>
            <Card variant="default" padding="comfortable" style={{ marginTop: wt.space[7] }}>
              <form onSubmit={handleSubmit}>
                <div style={{ position: "relative", marginBottom: 14 }}>
                  <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nueva contraseña (mín. 8)" required aria-label="Nueva contraseña" autoComplete="new-password" style={{ ...inputBase, paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPw((p) => !p)} aria-label={showPw ? "Ocultar" : "Mostrar"} style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: wt.color.textMuted, padding: 12, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <input type={showPw ? "text" : "password"} value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="Repite la contraseña" required aria-label="Confirmar contraseña" autoComplete="new-password" style={{ ...inputBase, marginBottom: password2 && password !== password2 ? 6 : 14 }} />
                {password2 && password !== password2 && (
                  <div style={{ ...wt.text.caption, color: wt.color.dangerInk, marginBottom: 14 }}>Las contraseñas no coinciden.</div>
                )}
                {error && (
                  <div role="alert" style={{ background: wt.color.dangerBg, border: `1px solid rgba(216,92,74,0.30)`, borderRadius: wt.radius.md, padding: "10px 14px", ...wt.text.bodySm, color: wt.color.dangerInk, marginBottom: 14 }}>
                    {error} <Link href="/forgot-password" style={{ color: wt.color.orange, textDecoration: "none", fontWeight: 600 }}>Solicitar nuevo enlace</Link>
                  </div>
                )}
                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} disabled={!valid} rightIcon={<ArrowRight size={16} />}>
                  {loading ? "Actualizando…" : "Guardar nueva contraseña"}
                </Button>
              </form>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
