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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wedge-os.vercel.app";
const DESCRIPTION =
  "Prepara tu mes fiscal para freelancers MX: calcula y ordena tu ISR/IVA y CFDIs. Tú validas y presentas en el SAT.";

export const metadata: Metadata = {
  // metadataBase: resuelve OG/canonical absolutos (sin esto, og:image/canonical salen como localhost en build).
  metadataBase: new URL(SITE_URL),
  title: { default: "wedge — Tu mes fiscal claro", template: "%s" },
  description: DESCRIPTION,
  applicationName: "wedge",
  robots: { index: true, follow: true },
  // El favicon lo sirve `src/app/icon.svg` (App Router) y la tarjeta social `src/app/opengraph-image.tsx`;
  // Next inyecta ambos automaticamente, asi que no hace falta declararlos aqui (antes apuntaba a un
  // /favicon.ico inexistente → 404).
  openGraph: {
    type: "website",
    siteName: "wedge",
    locale: "es_MX",
    title: "wedge — Tu mes fiscal claro",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "wedge — Tu mes fiscal claro",
    description: DESCRIPTION,
  },
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
