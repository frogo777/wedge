import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recuperar contraseña — wedge",
  description: "Te enviamos un enlace para restablecer tu contraseña de wedge.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/forgot-password" },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
