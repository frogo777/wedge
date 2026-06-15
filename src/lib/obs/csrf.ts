/**
 * CSRF protection — Origin/Referer check.
 *
 * Modelo de amenaza: usuario logueado en wedge con cookie de sesión.
 * Atacante hostea una página maliciosa que hace `<form action="https://wedgemx.com/api/billing/checkout" method="POST">`
 * con plan que el atacante elige. El navegador ENVÍA la cookie de sesión
 * porque la cookie de Supabase es SameSite=Lax (default), que permite
 * top-level POST cross-origin. Resultado: cargo en Stripe que el user
 * no inició.
 *
 * Defensa: validar que el header `Origin` (o `Referer` como fallback)
 * coincide con un origin permitido. Origin está set por el browser y
 * un atacante NO puede falsificarlo desde JS — está protegido por
 * Same-Origin Policy a nivel del browser.
 *
 * Lista de allowlist:
 *   - Production: `https://wedgemx.com` (set vía NEXT_PUBLIC_SITE_URL)
 *   - Vercel preview: `https://wedge-*.vercel.app`
 *   - Localhost para dev: `http://localhost:3000`
 *
 * NOTA: este check NO sustituye SameSite cookies — ambos defenden el
 * mismo ataque pero por distintos vectores. Defense in depth.
 */

// HARDENING: antes esto incluía `.vercel.app` wildcard — cualquier
// `evil-xxx.vercel.app` pasaba el guard y podía CSRF al user. Ahora solo
// permitimos el production host + previews del proyecto wedge (prefix
// `wedge-`) + localhost para dev. Esto bloquea preview deployments de
// cualquier otro proyecto, incluso del mismo team.
const ALLOWED_EXACT_HOSTS = [
  "wedgemx.com",
  "www.wedgemx.com",
];
const ALLOWED_PREVIEW_PREFIX = "wedge-"; // matches `wedge-<hash>-patogks-projects.vercel.app`
const ALLOWED_PREVIEW_SUFFIX = ".vercel.app";
const ALLOWED_LOCALHOSTS = ["localhost", "127.0.0.1"];

function hostFromUrl(u: string): string | null {
  try {
    return new URL(u).host.toLowerCase();
  } catch {
    return null;
  }
}

function isAllowedHost(host: string | null): boolean {
  if (!host) return false;
  // Remove port for matching.
  const bare = host.split(":")[0].toLowerCase();
  // Production hosts exactos.
  if (ALLOWED_EXACT_HOSTS.includes(bare)) return true;
  // Localhost para dev (puede tener cualquier puerto).
  if (ALLOWED_LOCALHOSTS.includes(bare)) return true;
  // Preview Vercel: solo del proyecto wedge — debe empezar con `wedge-` y
  // terminar en `.vercel.app`. Esto bloquea cualquier `evil-xxx.vercel.app`.
  if (bare.startsWith(ALLOWED_PREVIEW_PREFIX) && bare.endsWith(ALLOWED_PREVIEW_SUFFIX)) {
    return true;
  }
  return false;
}

/**
 * Devuelve null si la request es same-origin; Response 403 si no.
 *
 * Acepta `Origin` (preferido) o `Referer` como fallback. Si AMBOS faltan,
 * rechaza — un browser legítimo siempre envía al menos uno en POST.
 *
 * Casos legítimos donde puede faltar Origin:
 *   - Servidor a servidor (Vercel cron, etc) — esos no usan este check.
 *   - PWA standalone con `<meta name="referrer" content="no-referrer">` —
 *     no aplica a wedge actualmente.
 */
export function requireSameOrigin(req: Request): Response | null {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // Header source de verdad.
  const sourceUrl = origin || referer;
  if (!sourceUrl) {
    return Response.json(
      { error: "csrf_no_origin", message: "Falta header Origin/Referer" },
      { status: 403 },
    );
  }

  const sourceHost = hostFromUrl(sourceUrl);
  if (!isAllowedHost(sourceHost)) {
    return Response.json(
      { error: "csrf_origin_mismatch", message: "Request rechazada por seguridad" },
      { status: 403 },
    );
  }

  return null;
}
