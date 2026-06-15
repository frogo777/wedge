"use client";

/**
 * Banner de consentimiento de cookies / analíticas.
 *
 * Se muestra solo si el usuario aún no ha decidido. Persistencia en
 * localStorage vía `lib/consent.ts`. Dos opciones explícitas:
 *   - Aceptar todas (analytics ON)
 *   - Solo necesarias (analytics OFF; auth siempre activa)
 *   - Más detalles → /privacidad (interno)
 *
 * Estilo: Wedge Fiscal OS Design System (dark). Barra fija al pie, no modal
 * bloqueante. Permanece hasta que el usuario decide. (Migrado del estilo light
 * legacy `@/app/tokens` al DS `@/design-system/tokens` — Fase purge legacy v1.)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { hasDecidedConsent, setConsent } from "@/lib/consent";
import { wt } from "@/design-system/tokens";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Render after mount para evitar flash de SSR (localStorage no existe en server).
    setShow(!hasDecidedConsent());
    // Cross-tab sync: si el usuario decide en otra pestaña, ocultar acá también.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "wedge:consent:v1") {
        setShow(!hasDecidedConsent());
      }
    };
    // Same-tab sync (lib/consent.ts dispara este custom event).
    const onConsent = () => setShow(!hasDecidedConsent());
    window.addEventListener("storage", onStorage);
    window.addEventListener("wedge:consent-changed", onConsent);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("wedge:consent-changed", onConsent);
    };
  }, []);

  if (!show) return null;

  const accept = () => {
    setConsent("accepted");
    setShow(false);
  };
  const reject = () => {
    setConsent("rejected");
    setShow(false);
  };

  return (
    <div
      role="region"
      aria-label="Consentimiento de cookies"
      style={{
        position: "fixed",
        bottom: "max(12px, env(safe-area-inset-bottom, 0px))",
        left: 12,
        right: 12,
        maxWidth: 560,
        margin: "0 auto",
        zIndex: 100,
        padding: wt.space[6],
        background: wt.color.surfaceElevated,
        border: `1px solid ${wt.color.border}`,
        borderRadius: wt.radius.lg,
        boxShadow: wt.shadow.lg,
        fontFamily: wt.font.sans,
        color: wt.color.text,
        ...wt.text.bodySm,
      }}
    >
      <div style={{ marginBottom: wt.space[4] }}>
        <strong style={{ display: "block", marginBottom: 4, ...wt.text.label, color: wt.color.text }}>
          Cookies y privacidad
        </strong>
        <span style={{ color: wt.color.textMuted, ...wt.text.bodySm }}>
          Usamos cookies necesarias para que la app funcione (sesión, seguridad).
          También nos gustaría usar analíticas anónimas para mejorar wedge.{" "}
          <Link href="/privacidad" style={{ color: wt.color.orangeInk, textDecoration: "underline" }}>
            Más detalles
          </Link>
          .
        </span>
      </div>

      <div style={{ display: "flex", gap: wt.space[4], flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={accept}
          style={{
            ...wt.text.bodySm,
            background: wt.color.orange,
            color: "#fff",
            border: "none",
            borderRadius: wt.radius.md,
            padding: "8px 16px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: wt.font.sans,
          }}
        >
          Aceptar todas
        </button>
        <button
          type="button"
          onClick={reject}
          style={{
            ...wt.text.bodySm,
            background: "transparent",
            color: wt.color.text,
            border: `1px solid ${wt.color.border}`,
            borderRadius: wt.radius.md,
            padding: "8px 16px",
            fontWeight: 560,
            cursor: "pointer",
            fontFamily: wt.font.sans,
          }}
        >
          Solo necesarias
        </button>
      </div>
    </div>
  );
}
