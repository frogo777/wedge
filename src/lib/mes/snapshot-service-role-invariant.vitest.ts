import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Invariante de seguridad (Fase 5E.1): `fiscal_month_snapshots` se accede SOLO con el cliente de
 * SESIÓN (anon key + JWT del usuario → RLS owner-only). NUNCA con el cliente service-role
 * (`createServiceClient`), que tiene BYPASSRLS y leería/escribiría filas de TODOS los usuarios.
 * Este guard falla si una ruta/archivo futuro mezcla ambas cosas.
 */

const SRC = join(process.cwd(), "src");
const SNAPSHOT_REFS = [
  "fiscal_month_snapshots",
  "SNAPSHOT_TABLE",
  "saveFiscalMonthSnapshot",
  "loadLatestFiscalMonthSnapshot",
  "deleteFiscalMonthSnapshot",
];

function sourceFiles(): string[] {
  return readdirSync(SRC, { recursive: true })
    .map(String)
    .filter((f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.includes(".vitest.") && !f.endsWith(".test.ts"))
    .map((f) => join(SRC, f));
}

describe("invariante: el snapshot del Mes Fiscal nunca se toca vía service-role", () => {
  it("ningún archivo que use createServiceClient referencia la tabla/funciones del snapshot", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("createServiceClient")) continue;
      if (SNAPSHOT_REFS.some((r) => src.includes(r))) offenders.push(file);
    }
    expect(
      offenders,
      `service-role no debe tocar fiscal_month_snapshots (rompe RLS owner-only): ${offenders.join(", ")}`,
    ).toEqual([]);
  });
});
