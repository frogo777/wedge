// Vitest shim — replaces Next.js's `server-only` package, which throws when
// imported from a non-server context. Under tests we don't need that guard.
export {};
