import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nueva contraseña — wedge",
  description: "Elige una nueva contraseña para tu cuenta de wedge.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/reset-password" },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
