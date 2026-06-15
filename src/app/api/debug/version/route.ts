/**
 * GET /api/debug/version — metadata de build NO sensible, para diagnosticar
 * "deployment mismatch" (estás viendo código viejo). Devuelve el commit/branch/
 * entorno que ESTE servidor está corriendo. NO expone secretos, keys ni datos.
 *
 * Uso: abre `/api/debug/version` en el entorno sospechoso (prod, preview, local)
 * y compara `commit`/`ref` con el commit que esperas. Si prod muestra un commit
 * viejo o `ref: "main"` sin tu rebuild, estás ante un mismatch de despliegue.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 12),
    ref: process.env.VERCEL_GIT_COMMIT_REF ?? null, // rama desplegada (p.ej. "main")
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    region: process.env.VERCEL_REGION ?? null,
    runtime: "nodejs",
  });
}
