"use client";

/**
 * Client-side PostHog bootstrap.
 *
 * Mounted from `layout.tsx`. Inicializa el SDK de PostHog SOLO si:
 *   1. `NEXT_PUBLIC_POSTHOG_KEY` está configurado, y
 *   2. el usuario consintió analíticas (lib/consent.ts).
 *
 * Si el usuario rechazó o aún no decidió, no hay init — PostHog ni siquiera
 * carga su script. Cuando el usuario acepta vía banner, se dispara el
 * evento `wedge:consent-changed` y este provider re-evalúa.
 *
 * NUNCA enviamos `email` a PostHog (PII evitable). Solo `user.id` (UUID).
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  initPosthog,
  identifyUser,
  resetPosthog,
  isPosthogEnabled,
} from "@/lib/posthog";
import { isAnalyticsAllowed } from "@/lib/consent";

export function PostHogProvider() {
  const [analyticsOn, setAnalyticsOn] = useState(false);

  // Re-evalúa consent al montar y cada vez que cambie (en esta pestaña o
  // en otra abierta del usuario).
  useEffect(() => {
    setAnalyticsOn(isAnalyticsAllowed());
    const onChange = () => setAnalyticsOn(isAnalyticsAllowed());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "wedge:consent:v1") setAnalyticsOn(isAnalyticsAllowed());
    };
    window.addEventListener("wedge:consent-changed", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("wedge:consent-changed", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!isPosthogEnabled()) return;
    if (!analyticsOn) {
      // Si el usuario revocó consent en sesión, asegurar reset.
      try { resetPosthog(); } catch { /* noop */ }
      return;
    }
    initPosthog();

    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (data.user) {
        // Solo user.id — sin email para minimizar PII en analytics.
        identifyUser(data.user.id, {});
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        resetPosthog();
        return;
      }
      if (session?.user) {
        identifyUser(session.user.id, {});
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [analyticsOn]);

  return null;
}
