import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar sesión — wedge",
  description: "Entra a tu cuenta de wedge.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
