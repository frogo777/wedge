/**
 * Harness Vitest para los tests script-style del motor v1.
 *
 * Algunos tests del core (motor fiscal RESICO/Honorarios, parser CFDI 4.0,
 * rate-limit) predatan Vitest y exportan un `run*Tests()` que corre asserts y
 * devuelve `{ passed, failed }` o lanza. Este harness los ejecuta bajo
 * `npm run test` sin reescribirlos. Tests nuevos: autorar como `*.vitest.ts`.
 */
import { describe, it, expect } from "vitest";

async function runOrFail(label: string, fn: () => unknown | Promise<unknown>) {
  const r = (await fn()) as unknown;
  if (r && typeof r === "object" && "failed" in r) {
    const fr = r as { failed: number; passed?: number };
    if (fr.failed > 0) {
      throw new Error(`${label}: ${fr.failed} assertion(s) fallaron (ver stdout)`);
    }
    if (typeof fr.passed === "number") expect(fr.passed).toBeGreaterThan(0);
  }
}

describe("engine: tax/resico (Art. 113-E)", () => {
  it("runs", async () => {
    const { runResicoTests } = await import("@/lib/tax/resico.test");
    await runOrFail("tax/resico", runResicoTests);
  });
});

describe("engine: tax/honorarios", () => {
  it("runs", async () => {
    const { runHonorariosTests } = await import("@/lib/tax/honorarios.test");
    await runOrFail("tax/honorarios", runHonorariosTests);
  });
});

describe("engine: cfdi-parser 4.0", () => {
  it("base", async () => {
    const { runCfdiParserTests } = await import("@/lib/cfdi-parser.test");
    expect(() => runCfdiParserTests()).not.toThrow();
  });
  it("edges", async () => {
    const { runCfdiParserEdgeTests } = await import("@/lib/cfdi-parser-edges.test");
    await runOrFail("cfdi-parser-edges", runCfdiParserEdgeTests);
  });
});

describe("obs: rate-limit", () => {
  it("runs", async () => {
    const { runRateLimitTests } = await import("@/lib/obs/rate-limit.test");
    await runOrFail("obs/rate-limit", runRateLimitTests);
  });
});
