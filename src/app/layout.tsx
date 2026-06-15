import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ToastProvider } from "@/app/_components/Toast";
import { CookieBanner } from "@/app/_components/CookieBanner";
import { PostHogProvider } from "./posthog-provider";
import { ClarityScript } from "@/app/_components/ClarityScript";
import "./globals.css";
import "@/design-system/ds.css";

// Wedge Fiscal OS — dark-only DS. Geist Sans + Mono.
const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0C1017",
};

export const metadata: Metadata = {
  title: { default: "wedge — Tu mes fiscal claro", template: "%s" },
  description:
    "Copiloto fiscal mensual para freelancers MX: calcula, ordena y prepara tu ISR/IVA y CFDIs. Tú validas y presentas en el SAT.",
  applicationName: "wedge",
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body style={{ minHeight: "100vh", margin: 0, background: "var(--wds-bg-primary)", color: "var(--wds-text-primary)", colorScheme: "dark" }}>
        <a href="#main-content" className="skip-to-content">Saltar al contenido principal</a>
        <ToastProvider>
          {children}
          <CookieBanner />
        </ToastProvider>
        <PostHogProvider />
        <ClarityScript />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
