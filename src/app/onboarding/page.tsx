"use client";

/**
 * /onboarding — bienvenida post-signup (DS dark). Minimal: encamina al
 * diagnóstico (primer paso natural) o directo al Mes Fiscal. No fuerza nada
 * (el proxy no enforza onboarding en v1) ni escribe perfil; sin deps legacy.
 */

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { wt } from "@/design-system/tokens";
import { Button, Card, LogoLockup, PermissionList, SecurityNotice } from "@/design-system";

const FONT = wt.font.sans;

export default function Onboarding() {
  const router = useRouter();
  return (
    <div className="wds-root" style={{ minHeight: "100svh", background: wt.color.bgPrimary, color: wt.color.text, fontFamily: FONT, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ marginBottom: wt.space[7] }}>
          <Link href="/" aria-label="Wedge — inicio" style={{ display: "inline-flex", textDecoration: "none" }}>
            <LogoLockup variant="horizontal" tone="dark" size="md" />
          </Link>
        </div>

        <div style={{ ...wt.text.micro, color: wt.color.textMuted, marginBottom: wt.space[3] }}>Bienvenido</div>
        <h1 style={{ ...wt.text.h1, color: wt.color.text, margin: 0 }}>Tu mes fiscal, claro.</h1>
        <p style={{ ...wt.text.body, color: wt.color.textMuted, margin: `${wt.space[3]}px 0 0` }}>
          Empieza con un diagnóstico rápido (sin RFC ni datos del SAT) para armar tu primer Mes Fiscal, o entra directo.
        </p>

        <Card variant="default" padding="comfortable" style={{ marginTop: wt.space[7] }}>
          <div style={{ display: "flex", flexDirection: "column", gap: wt.space[5] }}>
            <PermissionList
              items={[
                { allowed: true, label: "Calculamos tu ISR/IVA como estimado informativo." },
                { allowed: true, label: "Tú decides qué CFDIs traer y cuándo." },
                { allowed: false, label: "Wedge no declara, no paga ni modifica información en SAT." },
              ]}
            />
            <div style={{ display: "flex", gap: wt.space[3], flexWrap: "wrap" }}>
              <Button variant="primary" size="lg" onClick={() => router.push("/diagnostico")} rightIcon={<ArrowRight size={16} />}>
                Hacer mi diagnóstico
              </Button>
              <Button variant="secondary" size="lg" onClick={() => router.push("/app/mes")} leftIcon={<Calendar size={16} />}>
                Ir a mi Mes Fiscal
              </Button>
            </div>
          </div>
        </Card>

        <div style={{ display: "flex", justifyContent: "center", marginTop: wt.space[6] }}>
          <SecurityNotice>Wedge prepara; tú validas y presentas en SAT.</SecurityNotice>
        </div>
      </div>
    </div>
  );
}
