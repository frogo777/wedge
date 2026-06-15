import type { Metadata } from "next";

/**
 * Server-side metadata for /luk. Page is a client component
 * (chat demo + interactive elements), so route metadata + JSON-LD
 * live here. Indexable: this is the "AI assistant" landing surface.
 */
export const metadata: Metadata = {
  title: "luk — el asistente fiscal con IA — wedge",
  description:
    "luk es el primer asistente fiscal con IA que entiende RESICO PF, en español. Responde dudas, hace cálculos y conoce la LISR, LIVA, CFF y la RMF 2025-2026.",
  alternates: { canonical: "/luk" },
  openGraph: {
    title: "luk — el asistente fiscal con IA — wedge",
    description:
      "Pregúntale a luk lo que sea sobre tus impuestos. Conoce la ley, tus CFDIs y tu régimen.",
    url: "/luk",
    siteName: "wedge",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "luk — IA fiscal de wedge" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "luk — el asistente fiscal con IA — wedge",
    description:
      "Pregúntale a luk lo que sea sobre tus impuestos. Conoce la ley, tus CFDIs y tu régimen.",
    images: ["/opengraph-image"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "luk — Asistente fiscal IA de wedge",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web, Android, Windows",
  url: "https://wedgemx.com/luk",
  description:
    "Asistente conversacional con IA especializado en fiscalidad mexicana. Conoce LISR, LIVA, CFF y la RMF 2025-2026. Integrado con tus CFDIs y régimen.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "MXN",
  },
};

export default function LukLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
