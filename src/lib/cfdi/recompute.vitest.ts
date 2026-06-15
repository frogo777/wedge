import { describe, it, expect } from "vitest";
import { getDemoCfdis } from "./fixtures";
import { fiscalMonthFromCfdis } from "@/lib/mes/from-cfdis";
import { redactPreviewForStorage, PREVIEW_VERSION, type StoredCfdiPreview } from "./preview-store";
import { fiscalMonthFromCfdiPreviewWithDecisions, redactedToNormalized } from "./recompute";
import type { InboxDecision } from "./inbox";

const NOW = new Date("2026-06-14T00:00:00.000Z");

const demo = getDemoCfdis();
const redacted = redactPreviewForStorage(demo);
const base = fiscalMonthFromCfdis(demo, { period: "2026-06", regime: "resico_pf", now: NOW });

const preview: StoredCfdiPreview = {
  version: PREVIEW_VERSION,
  savedAt: NOW.toISOString(),
  period: "2026-06",
  monthLabel: "Junio 2026",
  regimeLabel: "RESICO PF",
  source: "upload",
  cfdis: redacted,
  summary: { incomeDetected: base.incomeDetected, isrEstimate: base.isrEstimate, ivaEstimate: base.ivaEstimate, retentions: base.retentions },
};

describe("recompute / fiscalMonthFromCfdiPreviewWithDecisions", () => {
  it("sin decisiones → mismo cálculo base, sin nota temporal", () => {
    const m = fiscalMonthFromCfdiPreviewWithDecisions(preview, {}, { now: NOW });
    expect(m.incomeDetected).toBe(50000);
    expect(m.risks.some((r) => r.id === "inbox-decisiones-temporales")).toBe(false);
  });

  it("excluir un ingreso lo saca del cálculo y agrega nota temporal", () => {
    const pue = redacted.find((c) => c.subtotal === 18000 && c.direction === "emitido")!;
    const m = fiscalMonthFromCfdiPreviewWithDecisions(preview, { [pue.id]: "excluido" }, { now: NOW });
    expect(m.incomeDetected).toBe(32000); // 50000 − 18000
    expect(m.risks[0].id).toBe("inbox-decisiones-temporales");
    expect(m.risks[0].severity).toBe("info");
  });

  it("confirmar los ingresos NO cambia el monto pero quita el pendiente de confirmar", () => {
    const incomes = redacted.filter(
      (c) => c.direction === "emitido" && c.type === "ingreso" && (c.status === "detectado" || c.status === "requiereRevision"),
    );
    const decisions: Record<string, InboxDecision> = Object.fromEntries(incomes.map((c) => [c.id, "confirmado"]));
    const m = fiscalMonthFromCfdiPreviewWithDecisions(preview, decisions, { now: NOW });
    expect(m.incomeDetected).toBe(50000); // confirmar no suma dinero nuevo
    expect(m.pendingActions.some((p) => p.type === "confirmar_ingreso")).toBe(false);
  });

  it("decidir sobre un CANCELADO no altera el cálculo (terminal)", () => {
    const cancelado = redacted.find((c) => c.status === "cancelado")!;
    const m = fiscalMonthFromCfdiPreviewWithDecisions(preview, { [cancelado.id]: "confirmado" }, { now: NOW });
    expect(m.incomeDetected).toBe(50000); // un cancelado nunca contó; confirmarlo no lo cuenta
  });

  it("redactedToNormalized no reintroduce UUID/RFC reales", () => {
    const n = redactedToNormalized(redacted[0]);
    expect(n.uuid).toBeNull();
    expect(n.issuerRfcMasked).toBe("—");
    expect(n.monthKey).toBe("2026-06");
  });
});
