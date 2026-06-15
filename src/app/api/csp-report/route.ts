/**
 * POST /api/csp-report
 *
 * Endpoint donde el browser reporta violaciones de Content-Security-Policy.
 * El header `Content-Security-Policy` apunta aquí via `report-uri`.
 *
 * Útil para detectar:
 *  - Intentos de XSS (script de origen no permitido bloqueado)
 *  - Configuración CSP rota tras un deploy
 *  - 3rd party scripts que tu user instala en su browser
 *
 * Rate-limited fuerte (50/min/IP) para no ser usado como log sink.
 * NO requiere auth — el browser lo llama anónimo.
 */

import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/obs/with-handler";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/obs/rate-limit";
import { logEvent } from "@/lib/obs/logger";

export const runtime = "nodejs";

async function handlePOST(req: Request): Promise<Response> {
  const ip = clientIp(req);
  const rl = await rateLimit(`csp:${ip}`, 50, 60);
  if (!rl.allowed) return tooManyRequests(rl);

  let body: unknown;
  try {
    body = await (req as NextRequest).json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  /* Reporte tiene shape:
   * { "csp-report": {
   *     "document-uri": "...",
   *     "violated-directive": "script-src",
   *     "blocked-uri": "...",
   *     "source-file": "...",
   *     "line-number": 123,
   *     ...
   *   }} */
  const report = (body as Record<string, unknown>)?.["csp-report"] ?? body;
  if (typeof report !== "object" || !report) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const r = report as Record<string, unknown>;
  // Trim sizes — el browser puede mandar source-file URLs muy largas.
  const trim = (s: unknown, n: number) =>
    typeof s === "string" ? s.slice(0, n) : undefined;

  logEvent("csp_violation", {
    documentUri:        trim(r["document-uri"],     500),
    violatedDirective:  trim(r["violated-directive"], 200),
    blockedUri:         trim(r["blocked-uri"],      500),
    sourceFile:         trim(r["source-file"],      500),
    lineNumber:         typeof r["line-number"] === "number" ? r["line-number"] : undefined,
    referrer:           trim(r["referrer"],         300),
    userAgent:          req.headers.get("user-agent")?.slice(0, 200),
  });

  return NextResponse.json({ ok: true });
}

export const POST = withHandler(handlePOST, { route: "/api/csp-report" });
