/**
 * Sliding-window rate limiter — distribuido (Upstash Redis) o in-memory.
 *
 * Estrategia:
 *   - Si UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN están seteadas,
 *     usa Redis para rate limit DISTRIBUIDO. Esto previene bypass por
 *     concurrencia: cada lambda comparte el mismo bucket → limit es correcto
 *     incluso con N lambdas en paralelo.
 *   - Si Redis no está configurado, falls back a in-memory (per-lambda).
 *     Esto sirve para dev/local y como fallback si Upstash falla.
 *   - Si Redis está configurado pero la request falla (network glitch,
 *     timeout 1.5s), también cae a in-memory para no bloquear al usuario.
 *
 * Antes era sync; ahora es async porque Redis es I/O. Todos los callsites
 * deben usar `await rateLimit(...)`.
 */

import { rateLimitRedis, isRedisRateLimitConfigured } from "./rate-limit-redis";
import type { RateLimitResult } from "./rate-limit-types";

export type { RateLimitResult } from "./rate-limit-types";

type Bucket = {
  // timestamps (ms) of recent hits, pruned lazily
  hits: number[];
};

const BUCKETS = new Map<string, Bucket>();

// Keep the map from growing unbounded in a long-lived instance.
const MAX_BUCKETS = 10_000;

function rateLimitMemory(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const cutoff = now - windowMs;

  let bucket = BUCKETS.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    if (BUCKETS.size >= MAX_BUCKETS) {
      // Evict an arbitrary oldest-ish entry to bound memory.
      const firstKey = BUCKETS.keys().next().value;
      if (firstKey !== undefined) BUCKETS.delete(firstKey);
    }
    BUCKETS.set(key, bucket);
  }

  // Drop expired hits.
  while (bucket.hits.length && bucket.hits[0] <= cutoff) {
    bucket.hits.shift();
  }

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldest + windowMs,
    };
  }

  bucket.hits.push(now);
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.hits.length),
    resetAt: now + windowMs,
  };
}

/**
 * Rate limit con dispatch automático Redis → memory.
 * Async porque Redis requiere I/O; in-memory resuelve sync internamente.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  // Try Redis first si configurado.
  if (isRedisRateLimitConfigured()) {
    const redisResult = await rateLimitRedis(key, limit, windowSeconds);
    if (redisResult !== null) return redisResult;
    // Fall through a memory si Redis tuvo error/timeout — fail-open hacia
    // protección continua, no fail-closed que bloquearía requests legítimos.
  }
  return rateLimitMemory(key, limit, windowSeconds);
}


/**
 * Client IP extraction — orden por confiabilidad en Vercel.
 *
 * En Vercel los siguientes headers son TRUSTED (set por el edge proxy y
 * no modificables por el cliente):
 *   - `x-real-ip`           — IP del último hop antes de Vercel (cliente real).
 *   - `x-vercel-forwarded-for` — chain de proxies, primer entry = cliente.
 *
 * `x-forwarded-for` SÍ es modificable: un cliente puede mandar
 * `curl -H "x-forwarded-for: 1.1.1.1"` y el primer entry será su valor
 * inyectado. Vercel SÍ appendea su valor, pero el primer entry sigue
 * siendo el del cliente. Por eso lo dejamos como fallback ÚLTIMO.
 *
 * Truncación: IPv6 puede ser larga; recortamos a 64 chars para evitar
 * que un atacante llene el bucket map con IPs forjadas gigantes.
 */
export function clientIp(req: Request): string {
  const h = req.headers;
  // 1) x-real-ip — más confiable en Vercel (single value).
  const real = h.get("x-real-ip");
  if (real) return truncateIp(real.trim());
  // 2) x-vercel-forwarded-for — primer entry es el client real.
  const vercel = h.get("x-vercel-forwarded-for");
  if (vercel) return truncateIp(vercel.split(",")[0].trim());
  // 3) x-forwarded-for — UNTRUSTED (cliente puede inyectar). Solo como
  //    último recurso para entornos non-Vercel.
  const xf = h.get("x-forwarded-for");
  if (xf) return truncateIp(xf.split(",")[0].trim());
  return "unknown";
}

function truncateIp(ip: string): string {
  if (ip.length > 64) return ip.slice(0, 64);
  return ip;
}

/**
 * Builds a standard 429 Response with Retry-After + informative headers.
 */
export function tooManyRequests(result: RateLimitResult): Response {
  const retryAfterSec = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message: "Demasiadas solicitudes. Intenta de nuevo en unos momentos.",
      retryAfter: retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}
