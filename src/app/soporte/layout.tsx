import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Soporte — wedge",
  description:
    "Centro de ayuda y contacto de soporte para usuarios de wedge. Escríbenos sobre bugs, preguntas fiscales dentro del producto, cancelaciones o sugerencias.",
  alternates: { canonical: "/soporte" },
  openGraph: {
    title: "Soporte — wedge",
    description: "Centro de ayuda y contacto de soporte para usuarios de wedge.",
    url: "/soporte",
  },
};

export default function SoporteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
