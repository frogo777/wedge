"use client";

/**
 * Login — Wedge Fiscal OS Design System. Hermano de /signup.
 *
 * R7.1: en modo sin costo (sin SMTP ni Google OAuth configurados), el método PRINCIPAL y
 * único activo es CONTRASEÑA. El enlace mágico y Google se muestran DESHABILITADOS con copy
 * honesto ("Disponible cuando activemos el correo automático") para no prometer correos que
 * no llegan. Se conserva el step-up AAL2 (→ /login/2fa) y la traducción de errores.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { wt } from "@/design-system/tokens";
import { Button, Card, LogoLockup, SecurityNotice, Badge } from "@/design-system";
import { Eye, EyeOff, ArrowRight, Mail } from "lucide-react";

const FONT = wt.font.sans;

const inputBase: React.CSSProperties = {
  width: "100%",
  background: wt.color.surface,
  border: `1px solid ${wt.color.border}`,
  borderRadius: wt.radius.md,
  padding: "0 14px",
  height: 46,
  color: wt.color.text,
  fontSize: 16, // anti-zoom iOS
  fontFamily: FONT,
  boxSizing: "border-box",
  outline: "none",
  transition: `border-color ${wt.motion.base} ${wt.motion.ease}, box-shadow ${wt.motion.base} ${wt.motion.ease}`,
};

function focusRing(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = wt.color.borderFocus;
  e.currentTarget.style.boxShadow = wt.shadow.focus;
}
function blurRing(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = wt.color.border;
  e.currentTarget.style.boxShadow = "none";
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}

function Login() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();

  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    const e = searchParams?.get("error");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (e) setError(decodeURIComponent(e).slice(0, 200));
  }, [searchParams]);

  // Destino post-login: respeta ?next= interno; si no, el Mes Fiscal.
  // Excluye auth-pages para no crear loops (?next=/login).
  const rawNext = searchParams?.get("next");
  const nextDest = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
    && !rawNext.startsWith("/login") && !rawNext.startsWith("/signup")
    ? rawNext : "/app/mes";

  const normalizeEmail = (raw: string) => raw.trim().toLowerCase();

  const translateAuthError = (msg: string): string => {
    const m = msg.toLowerCase();
    if (m.includes("invalid login credentials") || m.includes("invalid email or password")) {
      return "Correo o contraseña incorrectos.";
    }
    if (m.includes("email not confirmed")) {
      return "Tu correo aún no está verificado. Pide a soporte que active tu cuenta.";
    }
    if (m.includes("too many requests") || m.includes("rate limit")) {
      return "Demasiados intentos. Espera 1 minuto antes de volver a intentar.";
    }
    if (m.includes("user not found") || m.includes("not found")) {
      // Security audit 2026-05-27: NO revelar si el email existe o no.
      return "Correo o contraseña incorrectos.";
    }
    if (m.includes("network") || m.includes("fetch failed") || m.includes("failed to fetch")) {
      return "Problema de conexión. Revisa tu internet e intenta de nuevo.";
    }
    if (m.includes("captcha")) {
      return "Necesitas resolver un captcha. Recarga la página e intenta de nuevo.";
    }
    return "No pudimos completar el inicio de sesión. Intenta de nuevo.";
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const cleanEmail = normalizeEmail(email);
    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error) {
      setError(translateAuthError(error.message));
      setLoading(false);
      return;
    }
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        router.push("/login/2fa");
        router.refresh();
        return;
      }
    } catch { /* fall through */ }
    router.push(nextDest);
    router.refresh();
  };

  const canSubmit = !!email && !!password;

  return (
    <div className="wds-root" style={{
      minHeight: "100svh", background: wt.color.bgPrimary, color: wt.color.text,
      fontFamily: FONT,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "40px 20px",
      paddingTop: "max(40px, env(safe-area-inset-top, 0px))",
      paddingBottom: "max(40px, env(safe-area-inset-bottom, 0px))",
    }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        {/* Logo */}
        <div style={{ marginBottom: wt.space[7] }}>
          <Link href="/" aria-label="Wedge — inicio" style={{ display: "inline-flex", textDecoration: "none" }}>
            <LogoLockup variant="horizontal" tone="dark" size="md" />
          </Link>
        </div>

        {/* Encabezado */}
        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>
          Bienvenido de vuelta
        </div>
        <h1 style={{ ...wt.text.h1, color: wt.color.text, margin: 0 }}>
          Vuelve a tu mes fiscal.
        </h1>
        <p style={{ ...wt.text.body, color: wt.color.textMuted, margin: `${wt.space[3]}px 0 0` }}>
          Entra con tu correo y contraseña. Retoma pendientes y próximos pasos antes del día 17.
        </p>

        <Card variant="default" padding="comfortable" style={{ marginTop: wt.space[7] }}>
          {/* Método principal: contraseña */}
          <form onSubmit={handlePasswordLogin}>
            <div style={{ marginBottom: 14 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                autoFocus
                aria-label="Correo electrónico"
                autoComplete="email"
                inputMode="email"
                style={inputBase}
                onFocus={focusRing}
                onBlur={blurRing}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  required
                  aria-label="Contraseña"
                  autoComplete="current-password"
                  style={{ ...inputBase, paddingRight: 44 }}
                  onFocus={focusRing}
                  onBlur={blurRing}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                  style={{
                    position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: wt.color.textMuted, padding: 12,
                    minWidth: 44, minHeight: 44,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ marginTop: 6, textAlign: "right" }}>
                <Link href="/forgot-password" style={{ ...wt.text.caption, color: wt.color.orange, textDecoration: "none" }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {error && (
              <div role="alert" aria-live="assertive" style={{
                background: wt.color.dangerBg, border: `1px solid rgba(216,92,74,0.30)`,
                borderRadius: wt.radius.md, padding: "10px 14px", ...wt.text.bodySm, color: wt.color.dangerInk,
                marginBottom: 14,
              }}>
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={!canSubmit}
              rightIcon={<ArrowRight size={16} />}
            >
              {loading ? "Entrando…" : "Iniciar sesión"}
            </Button>
          </form>

          {/* Métodos sociales / sin contraseña: deshabilitados hasta activar correo automático */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 14px" }}>
            <div style={{ flex: 1, height: 1, background: wt.color.border }} />
            <span style={{ ...wt.text.micro, color: wt.color.textMuted }}>más opciones</span>
            <div style={{ flex: 1, height: 1, background: wt.color.border }} />
          </div>

          <DisabledMethod icon={<GoogleG />} label="Continuar con Google" />
          <DisabledMethod icon={<Mail size={16} />} label="Enviar enlace mágico" />

          <p style={{ ...wt.text.caption, color: wt.color.textMuted, textAlign: "center", margin: `${wt.space[3]}px 0 0` }}>
            El acceso con Google y por enlace mágico estará disponible cuando activemos el correo automático.
          </p>
        </Card>

        {/* Trust microcopy */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: wt.space[6] }}>
          <SecurityNotice>Wedge prepara; tú validas y presentas en SAT.</SecurityNotice>
        </div>

        {/* Signup link */}
        <p style={{ textAlign: "center", ...wt.text.body, color: wt.color.textMuted, marginTop: wt.space[5] }}>
          ¿No tienes cuenta?{" "}
          <Link href="/signup" style={{ color: wt.color.orange, textDecoration: "none", fontWeight: 560 }}>
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}

/** Botón de método de login deshabilitado (con badge "Pronto"); honesto en modo sin costo. */
function DisabledMethod({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      aria-disabled
      style={{
        width: "100%", height: 46, padding: "0 16px", marginBottom: 10,
        background: wt.color.surface, border: `1px solid ${wt.color.border}`,
        borderRadius: wt.radius.md, opacity: 0.6,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        ...wt.text.label, color: wt.color.textMuted, cursor: "not-allowed",
      }}
    >
      <span style={{ display: "inline-flex" }}>{icon}</span>
      <span>{label}</span>
      <Badge variant="outline" size="sm">Pronto</Badge>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C33.6 6.1 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C33.6 6.1 29 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c4.9 0 9.4-1.9 12.8-5l-5.9-5c-2 1.4-4.5 2.2-7 2.2-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l5.9 5c-.4.4 6.1-4.5 6.1-14.7 0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
