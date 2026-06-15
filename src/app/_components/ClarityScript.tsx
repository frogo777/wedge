/**
 * Microsoft Clarity — heatmaps + session recordings (free, unlimited).
 *
 * Complementa PostHog: Clarity es excelente para heatmaps de scroll/click
 * y recordings sin límite de sesiones; PostHog es mejor para funnels +
 * feature flags + events tipados.
 *
 * Gated en `NEXT_PUBLIC_CLARITY_ID` y en consent de analytics (mismo
 * gate que PostHog). Sin ID o sin consent: no-op silencioso.
 *
 * Privacy: Clarity tiene built-in masking de inputs sensibles por
 * default. Adicionalmente cualquier input/element con `data-clarity-mask`
 * o class `ph-no-capture` queda enmascarado.
 */

"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { isAnalyticsAllowed } from "@/lib/consent";

declare global {
  interface Window {
    clarity?: (cmd: string, ...args: unknown[]) => void;
  }
}

export function ClarityScript() {
  const id = process.env.NEXT_PUBLIC_CLARITY_ID;
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(isAnalyticsAllowed());
    const onChange = () => setAllowed(isAnalyticsAllowed());
    window.addEventListener("wedge:consent-changed", onChange);
    return () => window.removeEventListener("wedge:consent-changed", onChange);
  }, []);

  if (!id || !allowed) return null;

  return (
    <Script
      id="ms-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${id}");
        `,
      }}
    />
  );
}
