import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (middleware de Next 16). Gating de sesión server-side con Supabase.
 *  - Rutas protegidas (`/app`, `/onboarding`) sin sesión → /login.
 *  - Auth-pages (`/login`, `/signup`) con sesión → /app/mes (respeta `?next=` interno seguro).
 *
 * Nota: 2FA/AAL2 y el gate de onboarding-done quedan diferidos en v1 (0 usuarios
 * con 2FA; el Mes Fiscal funciona sin onboarding forzado). Se añaden cuando se
 * reconstruya /login/2fa y se enforce el perfil.
 */
const PROTECTED = ["/app", "/onboarding"];
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && user) {
    // Default post-login = Mes Fiscal; respeta ?next= interno seguro (no loops).
    const rawNext = request.nextUrl.searchParams.get("next");
    const safeNext =
      rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") &&
      !rawNext.startsWith("/login") && !rawNext.startsWith("/signup");
    return NextResponse.redirect(new URL(safeNext ? rawNext! : "/app/mes", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
