"use client";

/**
 * Signup — migrado al Wedge Fiscal OS Design System (Fase 3B.1).
 *
 * Continuación natural de `/diagnostico`: misma piel dark warm-graphite, Geist,
 * naranja UI solo en el CTA, LogoLockup, TrustPanel + PermissionList + SecurityNotice.
 *
 * La LÓGICA de auth NO se reescribió: se conserva intacta `supabase.auth.signUp`,
 * Google OAuth (→ /auth/callback?next=/onboarding), reenvío de verificación,
 * cookie de referido, eventos de analítica, medidor de fuerza y traducción de
 * errores. Esta fase solo cambia la presentación y el copy de conversión.
 *
 * Copy: "Guarda tu mes fiscal." · diagnóstico antes de cuenta · sin SAT obligatorio
 * · Wedge prepara, tú validas. Cero claims prohibidos.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { wt } from "@/design-system/tokens";
import { Button, Card, LogoLockup, TrustPanel, PermissionList, SecurityNotice, Badge } from "@/design-system";
import { Eye, EyeOff, ArrowRight, CheckCircle } from "lucide-react";
import { funnel } from "@/lib/analytics/events";

const FONT = wt.font.sans;
const REF_COOKIE = "wedge_ref";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const inputBase: React.CSSProperties = {
  width: "100%",
  background: wt.color.surface,
  border: `1px solid ${wt.color.border}`,
  borderRadius: wt.radius.md,
  padding: "0 14px",
  height: 46,
  color: wt.color.text,
  fontSize: 16, // 16px = no zoom en iOS
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

/**
 * R8: Google se muestra DESHABILITADO con badge "Pronto" (igual que /login). Google OAuth está
 * diferido en modo sin costo; antes este botón llamaba a signInWithOAuth y, sin Google configurado,
 * llevaba a un error. Honesto y consistente con login. (Se reactiva cuando se configure Google.)
 */
function DisabledMethod({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      aria-disabled
      style={{
        width: "100%", height: 46, padding: "0 16px",
        background: wt.color.surface, border: `1px solid ${wt.color.border}`,
        borderRadius: wt.radius.md, opacity: 0.6,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        fontSize: 14, fontWeight: 560, color: wt.color.textMuted, fontFamily: FONT, cursor: "not-allowed",
      }}
    >
      <span style={{ display: "inline-flex" }}>{icon}</span>
      <span>{label}</span>
      <Badge variant="outline" size="sm">Pronto</Badge>
    </div>
  );
}

/**
 * Reenvío del email de verificación. Lógica intacta: `auth.resend` con cooldown
 * local de 60s contra el rate-limit del provider.
 */
function ResendEmailButton({ email }: { email: string }) {
  const supabase = createClient();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [cooldown, setCooldown] = useState(0);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  async function resend() {
    if (state === "sending" || cooldown > 0) return;
    setState("sending"); setErrMsg("");
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) {
        setState("error");
        setErrMsg(error.message || "No se pudo reenviar. Intenta en un momento.");
      } else {
        setState("sent");
        setCooldown(60);
      }
    } catch {
      setState("error");
      setErrMsg("Sin conexión. Intenta de nuevo.");
    }
  }

  const disabled = state === "sending" || cooldown > 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <button
        type="button"
        onClick={resend}
        disabled={disabled}
        style={{
          appearance: "none",
          background: "transparent",
          border: `1px solid ${wt.color.border}`,
          borderRadius: wt.radius.md,
          padding: "10px 16px",
          fontSize: 13,
          fontWeight: 560,
          color: disabled ? wt.color.textMuted : wt.color.text,
          cursor: disabled ? "default" : "pointer",
          fontFamily: FONT,
          transition: `background ${wt.motion.base} ${wt.motion.ease}`,
        }}
      >
        {state === "sending"
          ? "Reenviando…"
          : cooldown > 0
          ? `Reenviar en ${cooldown}s`
          : state === "sent"
          ? "Reenviado ✓ (revisa también spam)"
          : "Reenviar correo de confirmación"}
      </button>
      {state === "error" && (
        <span role="alert" style={{ fontSize: 12, color: wt.color.danger }}>{errMsg}</span>
      )}
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const supabase = createClient();
  const search   = useSearchParams();

  // email + password (el nombre se captura en /onboarding step 2 — menor fricción).
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [done, setDone]         = useState(false);

  // Intent de origen: si el usuario viene del diagnóstico, mostramos copy honesto. El draft del
  // diagnóstico SÍ se persiste en localStorage y /app/mes lo retoma como primer Mes Fiscal (R7.5).
  const fromDiagnostico =
    search?.get("from") === "diagnostico" || search?.get("intent") === "guardar-mes";

  // UX funnel: el user llegó a /signup. Fail-soft + idempotente.
  useEffect(() => {
    try { funnel.signupStarted(); } catch { /* swallow */ }
  }, []);

  const canSubmit = email && password.length >= 8;

  const pwStrength = (() => {
    if (!password) return { score: 0, label: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    const labels = ["", "Débil", "Aceptable", "Buena", "Fuerte", "Muy fuerte"];
    return { score: Math.min(score, 5), label: labels[Math.min(score, 5)] };
  })();

  useEffect(() => {
    const raw = search?.get("ref")?.trim();
    if (!raw) return;
    const dismissed = readCookie("wedge_ref_dismissed") === "1";
    if (dismissed) return;
    const code = raw.toUpperCase();
    if (code === "NONE") {
      document.cookie = `${REF_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
      return;
    }
    if (code.length >= 5 && code.length <= 12 && /^[A-Z0-9]+$/.test(code)) {
      const maxAge = 60 * 60 * 24 * 30;
      document.cookie = `${REF_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
  }, [search]);

  const translateSignupError = (msg: string): string => {
    const m = msg.toLowerCase();
    if (m.includes("user already registered") || m.includes("already exists")) {
      return "Ya existe una cuenta con ese correo. Intenta iniciar sesión o recupera tu contraseña.";
    }
    if (m.includes("password") && m.includes("short")) {
      return "Tu contraseña es muy corta. Usa al menos 8 caracteres.";
    }
    if (m.includes("password") && m.includes("weak")) {
      return "Tu contraseña es muy débil. Combina letras, números y un símbolo.";
    }
    if (m.includes("invalid email") || m.includes("email")) {
      return "Ese correo no parece válido. Revísalo e intenta de nuevo.";
    }
    if (m.includes("rate limit") || m.includes("too many")) {
      return "Demasiados intentos. Espera 1 minuto.";
    }
    if (m.includes("network") || m.includes("fetch failed") || m.includes("failed to fetch")) {
      return "Problema de conexión. Revisa tu internet.";
    }
    return "No pudimos crear tu cuenta. Intenta de nuevo en unos segundos.";
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signUp({
      email: cleanEmail, password,
      options: {
        // full_name se capturará en /onboarding step 2 (no en signup).
        // El link de confirmación DEBE pasar por /auth/callback para intercambiar el code (PKCE);
        // ir directo a /onboarding dejaba el code sin canjear → sin sesión → bounce a /login.
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent("/onboarding")}`,
      },
    });

    if (error) {
      setError(translateSignupError(error.message));
      setLoading(false);
    } else {
      const refCode = readCookie(REF_COOKIE);
      if (refCode) {
        try {
          await fetch("/api/referrals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: refCode }),
          });
        } catch { /* non-fatal */ }
      }
      // PostHog AARRR Acquisition. Fail-soft.
      try {
        const { aarrr } = await import("@/lib/posthog");
        aarrr.signupCompleted("email");
      } catch { /* swallow */ }
      try { funnel.signupCompleted({ plan: "free" }); } catch { /* swallow */ }
      setDone(true);
    }
  };

  /* ─── Done state (verificación de email) ─── */
  if (done) {
    return (
      <div className="wds-root" style={{
        minHeight: "100svh", background: wt.color.bgPrimary, color: wt.color.text,
        fontFamily: FONT,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 20px",
        paddingTop: "max(24px, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(24px, env(safe-area-inset-bottom, 0px))",
      }}>
        <div style={{ textAlign: "center", maxWidth: 420, width: "100%" }}>
          <div style={{
            width: 72, height: 72, background: wt.color.successBg,
            border: `1px solid rgba(77,159,111,0.30)`, borderRadius: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 28px",
          }}>
            <CheckCircle size={32} color={wt.color.success} />
          </div>
          <h1 style={{ ...wt.text.h1, color: wt.color.text, marginBottom: 10 }}>
            Revisa tu correo
          </h1>
          <p style={{ ...wt.text.body, color: wt.color.textMuted, lineHeight: 1.6, marginBottom: 14 }}>
            Enviamos un enlace de confirmación a{" "}
            <strong style={{ color: wt.color.text }}>{email}</strong>.
            {" "}Click ahí para activar tu cuenta y empezar.
          </p>
          {/* R8: honesto — en modo sin costo el correo automático puede no llegar; ruta de activación manual. */}
          <p style={{ ...wt.text.caption, color: wt.color.textMuted, lineHeight: 1.6, marginBottom: 18 }}>
            ¿No te llega en unos minutos? Escríbenos a{" "}
            <a href="mailto:hola@wedgemx.com" style={{ color: wt.color.orange, textDecoration: "none" }}>hola@wedgemx.com</a>
            {" "}y activamos tu cuenta.
          </p>
          <ResendEmailButton email={email} />
          <div style={{ marginTop: 24 }}>
            <Link href="/login" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              color: wt.color.orange, textDecoration: "none", fontWeight: 560, fontSize: 14,
            }}>
              Ir a iniciar sesión <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Form ─── */
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

        {/* Encabezado de conversión */}
        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>
          Crear cuenta · sin tarjeta
        </div>
        <h1 style={{ ...wt.text.h1, color: wt.color.text, margin: 0 }}>
          Guarda tu mes fiscal.
        </h1>
        <p style={{ ...wt.text.body, color: wt.color.textMuted, margin: `${wt.space[3]}px 0 0` }}>
          Crea tu cuenta para conservar tu diagnóstico, revisar pendientes y continuar antes del día 17.
        </p>
        <p style={{ ...wt.text.caption, color: wt.color.textMuted, margin: `${wt.space[3]}px 0 0` }}>
          Sin conectar SAT · Sin tarjeta · Tú validas todo en SAT
        </p>

        {fromDiagnostico && (
          <div style={{
            marginTop: wt.space[5],
            padding: `${wt.space[4]}px ${wt.space[5]}px`,
            background: wt.color.trustPanel,
            border: "1px solid rgba(100,116,139,0.20)",
            borderRadius: wt.radius.md,
          }}>
            <span style={{ ...wt.text.bodySm, color: wt.color.trustInk }}>
              Tu diagnóstico se guardó en este navegador; al crear tu cuenta lo retomamos como tu primer Mes Fiscal.
            </span>
          </div>
        )}

        {/* Card: Google + form */}
        <Card variant="default" padding="comfortable" style={{ marginTop: wt.space[7] }}>
          <DisabledMethod icon={<GoogleG />} label="Continuar con Google" />

          {/* Divider — el correo es el método activo (Google llega "Pronto") */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 18px" }}>
            <div style={{ flex: 1, height: 1, background: wt.color.border }} />
            <span style={{ ...wt.text.micro, color: wt.color.textMuted }}>crea tu cuenta con correo</span>
            <div style={{ flex: 1, height: 1, background: wt.color.border }} />
          </div>

          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              aria-label="Correo electrónico"
              autoComplete="email"
              inputMode="email"
              style={inputBase}
              onFocus={focusRing}
              onBlur={blurRing}
            />

            <div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña (mínimo 8 caracteres)"
                  required
                  minLength={8}
                  aria-label="Contraseña"
                  autoComplete="new-password"
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
              {password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: pwStrength.score >= i
                          ? pwStrength.score <= 2 ? wt.color.danger
                          : pwStrength.score === 3 ? wt.color.warning
                          : wt.color.success
                          : wt.color.border,
                        transition: `background ${wt.motion.base} ${wt.motion.ease}`,
                      }} />
                    ))}
                  </div>
                  {pwStrength.label && (
                    <div style={{ ...wt.text.caption, color: wt.color.textMuted, marginTop: 5 }}>
                      Fuerza: <strong style={{
                        color: pwStrength.score <= 2 ? wt.color.danger
                          : pwStrength.score === 3 ? wt.color.warning
                          : wt.color.success,
                      }}>{pwStrength.label}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div role="alert" style={{
                background: wt.color.dangerBg, border: `1px solid rgba(216,92,74,0.30)`,
                borderRadius: wt.radius.md, padding: "10px 14px", ...wt.text.bodySm, color: wt.color.dangerInk,
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
              style={{ marginTop: 6 }}
            >
              {loading ? "Creando cuenta…" : "Crear cuenta"}
            </Button>
          </form>
        </Card>

        {/* Confianza */}
        <div style={{ marginTop: wt.space[6] }}>
          <TrustPanel
            title="Tus datos, bajo tu control"
            description="Wedge prepara; tú validas y presentas en SAT."
            footnote={<SecurityNotice>Tus credenciales se cifran (AES-256) y solo tú las usas.</SecurityNotice>}
          >
            <PermissionList
              items={[
                { allowed: true,  label: "Puedes empezar sin conectar SAT." },
                { allowed: false, label: "Wedge no declara, no paga ni modifica información en SAT." },
                { allowed: true,  label: "Podrás traer CFDIs después con XML/ZIP o conexión SAT." },
              ]}
            />
          </TrustPanel>
        </div>

        {/* Términos */}
        <p style={{ ...wt.text.caption, color: wt.color.textMuted, textAlign: "center", marginTop: wt.space[6], lineHeight: 1.55 }}>
          Al crear tu cuenta aceptas nuestros{" "}
          <Link href="/terminos" style={{ color: wt.color.textSecondary, textDecoration: "underline" }}>Términos</Link>
          {" "}y{" "}
          <Link href="/privacidad" style={{ color: wt.color.textSecondary, textDecoration: "underline" }}>Privacidad</Link>.
        </p>

        {/* Login link */}
        <p style={{ textAlign: "center", ...wt.text.body, color: wt.color.textMuted, marginTop: wt.space[5] }}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" style={{ color: wt.color.orange, textDecoration: "none", fontWeight: 560 }}>
            Ya tengo cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
