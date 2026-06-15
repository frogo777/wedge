/**
 * GET /auth/callback?code=...&next=/app/mes
 *
 * OAuth callback handler for Supabase Auth flows (Google, magic links,
 * email confirmation, password recovery). Supabase redirects here with `code`
 * in the query string after the user finishes the external auth step. We
 * exchange that code for a session (sets the auth cookie via the SSR client),
 * then redirect to `next` (defaulting to /app/mes, Fase 4C).
 *
 * Without this route, the user would land on the target with `?code=...` in
 * the URL but no session cookie — the protected page then redirects them back
 * to /login and the loop continues. Por eso signup/magic-link/recovery deben
 * apuntar `emailRedirectTo`/`redirectTo` AQUÍ, no directo a la página destino.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const errorDescription = url.searchParams.get("error_description");
  // Default post-auth interno: el Mes Fiscal (Fase 4C). Respeta `next` explícito.
  const rawNext = url.searchParams.get("next") ?? "/app/mes";

  // Whitelist `next` to internal paths only (defensa contra open redirect +
  // loops hacia páginas de auth). Excluye `//`, `/login` y `/signup` → si no
  // pasa, default al Mes Fiscal (Fase 4C). Espeja la lógica de proxy.ts/login.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//")
    && !rawNext.startsWith("/login") && !rawNext.startsWith("/signup")
    ? rawNext
    : "/app/mes";

  // Provider returned an error before we even got a code.
  if (errorDescription) {
    const safe = encodeURIComponent(errorDescription.slice(0, 200));
    return NextResponse.redirect(new URL(`/login?error=${safe}`, url.origin));
  }

  if (!code) {
    // Direct hit with no code — send them to login.
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const safe = encodeURIComponent(error.message.slice(0, 200));
    return NextResponse.redirect(
      new URL(`/login?error=${safe}`, url.origin),
    );
  }

  // Session cookie is set on the response by Supabase SSR client.
  return NextResponse.redirect(new URL(next, url.origin));
}
