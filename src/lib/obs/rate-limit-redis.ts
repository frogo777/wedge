/**
 * Rate limiter distribuido con Upstash Redis REST API.
 *
 * Por qué existe: el rate limiter in-memory tiene un bucket por lambda.
 * En Vercel cada lambda concurrent tiene su propio Map, así que el
 * límite efectivo para abuse-critical flows es `limit × N_concurrent_lambdas`.
 * Para flows como ARCO submission o /api/luca un atacante puede multiplicar
 * el rate limit simplemente forzando concurrencia.
 *
 * Esta implementación usa Redis Sorted Set como sliding window:
 *   - ZADD key score=ts member=ts (cada hit es un timestamp)
 *   - ZREMRANGEBYSCORE key 0 (ts - windowMs) — purge expired
 *   - ZCARD key — count actual
 *   - EXPIRE key 2*windowSec — autovacuum si la key se queda fría
 *
 * Setup: configurar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`
 * en Vercel env. Si NO están configuradas, el wrapper devuelve null y el
 * caller debe hacer fallback al limiter in-memory.
 *
 * No depende del SDK `@upstash/redis` para mantener bundle size pequeño
 * — usamos fetch directo al REST API.
 */

import type { RateLimitResult } from "./rate-limit-types";

function isConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/**
 * Ejecuta una pipeline de comandos contra Upstash REST API.
 * Devuelve null si Redis no está configurado o la request falla — el
 * caller debe hacer fallback a in-memory.
 */
async function pipeline(commands: Array<Array<string | number>>): Promise<unknown[] | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      // Cap latency: 1.5s. Si Upstash está degradado, fallback a memory
      // antes que bloquear request del usuario.
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const data = await res.json() as Array<{ result: unknown } | { error: string }>;
    return data.map((r) => "result" in r ? r.result : null);
  } catch {
    return null;
  }
}

/**
 * Lua script atómico para sliding-window rate limit.
 *
 * Antes hacíamos ZADD-first y CHECK-after, lo cual añadía hits incluso
 * cuando estaban bloqueados — un spammer con clicks reset perpetuamente
 * el window. Este script verifica count ANTES de añadir, asegurando
 * comportamiento idéntico al limiter in-memory:
 *
 *   - Cleanup expirados (ZREMRANGEBYSCORE)
 *   - Count actual (ZCARD)
 *   - Si count >= limit → blocked, NO ZADD
 *   - Si count < limit  → ZADD nuevo hit + EXPIRE para GC
 *
 * Devuelve `[allowed_flag, count, oldest_score]` donde:
 *   - allowed_flag: 1 si permitido, 0 si bloqueado
 *   - count: número de hits en la ventana DESPUÉS del posible ZADD
 *   - oldest_score: timestamp ms del hit más viejo (para resetAt)
 */
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local cutoff = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local window_sec = tonumber(ARGV[4])
local member = ARGV[5]

redis.call('ZREMRANGEBYSCORE', key, 0, cutoff)
local count = redis.call('ZCARD', key)

if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local oldest_score = oldest[2] and tonumber(oldest[2]) or now
  return {0, count, oldest_score}
end

redis.call('ZADD', key, now, member)
redis.call('EXPIRE', key, window_sec * 2)
return {1, count + 1, now}
`.trim();

/**
 * Sliding-window rate limit en Redis. Devuelve null si Redis no está
 * configurado o tuvo error (caller hace fallback).
 */
export async function rateLimitRedis(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult | null> {
  if (!isConfigured()) return null;

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const cutoff = now - windowMs;
  const fullKey = `wedge:rl:${key}`;
  const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;

  // EVAL atómico: check-then-add en una sola operación. Upstash REST
  // pipeline NO es transactional entre commands, por eso usamos Lua.
  const results = await pipeline([
    ["EVAL", SLIDING_WINDOW_LUA, 1, fullKey, now, cutoff, limit, windowSeconds, member],
  ]);

  if (!results || !Array.isArray(results[0])) return null;
  const [allowedFlag, count, oldestScore] = results[0] as [number, number, number];

  if (allowedFlag === 0) {
    return {
      allowed:   false,
      remaining: 0,
      resetAt:   Number(oldestScore) + windowMs,
    };
  }

  return {
    allowed:   true,
    remaining: Math.max(0, limit - Number(count)),
    resetAt:   now + windowMs,
  };
}

export { isConfigured as isRedisRateLimitConfigured };
