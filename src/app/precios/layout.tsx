import type { Metadata } from "next";

/**
 * Server-side metadata for /precios (fuente única de la ruta).
 *
 * La página es server component (Fase 3B.2) y podría exportar su propia metadata,
 * pero se mantiene aquí para conservar OG/Twitter en un solo lugar. Copy alineado
 * con la nueva página: diagnóstico-first, sin escasez/presión, sin claims prohibidos.
 */
export const metadata: Metadata = {
  title: "Precios — wedge",
  description:
    "Empieza entendiendo tu mes fiscal con un diagnóstico gratis. Wedge prepara tu ISR, IVA y pendientes antes del día 17; tú validas y presentas en SAT. Sin conectar SAT, sin tarjeta.",
  alternates: { canonical: "/precios" },
  openGraph: {
    title: "Precios — wedge",
    description:
      "Haz un diagnóstico gratis y decide si preparar tu mes completo con Wedge. Wedge prepara; tú validas en SAT.",
    url: "/precios",
    siteName: "wedge",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Precios wedge" }],
  },
  twitter: {
    title: "Precios — wedge",
    description:
      "Haz un diagnóstico gratis y decide si preparar tu mes completo con Wedge. Wedge prepara; tú validas en SAT.",
  },
};

export default function PreciosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
