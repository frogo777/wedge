import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crear cuenta — wedge",
  description: "Crea tu cuenta gratis en wedge y configura tu perfil fiscal.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/signup" },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
