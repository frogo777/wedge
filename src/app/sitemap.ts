import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wedge-os.vercel.app";

// Solo rutas públicas v1. /app/* es auth-gated (noindex), no va en sitemap.
const ROUTES = [
  "",
  "/diagnostico",
  "/precios",
  "/seguridad",
  "/luk",
  "/faq",
  "/soporte",
  "/privacidad",
  "/terminos",
  "/legal/uso-credenciales-sat",
  "/login",
  "/signup",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((r) => ({
    url: `${BASE}${r}`,
    changeFrequency: "weekly" as const,
    priority: r === "" ? 1 : r === "/diagnostico" || r === "/precios" ? 0.8 : 0.6,
  }));
}
