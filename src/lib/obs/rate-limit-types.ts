/**
 * Shared types between in-memory and Redis rate limiters.
 * Separar a archivo propio evita ciclos de import.
 */
export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms when the oldest hit in the current window falls off
};
