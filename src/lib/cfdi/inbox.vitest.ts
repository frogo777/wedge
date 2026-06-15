import { describe, it, expect } from "vitest";
import { getDemoCfdis } from "./fixtures";
import { redactCfdiForClient } from "./upload";
import {
  inboxSummary, filterItems, effectiveStatus, cfdiStatusChip, cfdiTitle, cfdiImpact,
  applyCfdiDecisions, summarizeCfdiDecisions, type InboxDecision,
} from "./inbox";

const items = getDemoCfdis().map(redactCfdiForClient);

describe("cfdi/inbox", () => {
  it("el resumen cuenta estados correctamente (demo)", () => {
    const s = inboxSummary(items, {});
    expect(s.total).toBe(7);
    expect(s.cancelados).toBe(1);
    expect(s.pendientesComplemento).toBe(1);
    expect(s.ingresosCount).toBeGreaterThanOrEqual(3);
    expect(s.gastosCount).toBe(1);
  });

  it("filtro 'requiere revisión' solo devuelve items en ese estado efectivo", () => {
    const rev = filterItems(items, {}, "revision");
    expect(rev.length).toBeGreaterThan(0);
    expect(rev.every((c) => effectiveStatus(c, undefined) === "requiereRevision")).toBe(true);
  });

  it("filtros ingresos/gastos/cancelados segmentan bien", () => {
    expect(filterItems(items, {}, "gastos")).toHaveLength(1);
    expect(filterItems(items, {}, "cancelados")).toHaveLength(1);
    expect(filterItems(items, {}, "ingresos").length).toBeGreaterThanOrEqual(3);
  });

  it("acción confirmar cambia el estado temporal y el conteo", () => {
    const id = items[0].id;
    expect(effectiveStatus(items[0], "confirmado")).toBe("confirmado");
    expect(inboxSummary(items, { [id]: "confirmado" }).confirmados).toBeGreaterThanOrEqual(1);
  });

  it("acción excluir cambia el estado temporal y el conteo", () => {
    const id = items[0].id;
    expect(effectiveStatus(items[0], "excluido")).toBe("excluido");
    expect(inboxSummary(items, { [id]: "excluido" }).excluidos).toBeGreaterThanOrEqual(1);
  });

  it("decidir sobre un cancelado NO lo cambia (estado terminal) ni doble-cuenta", () => {
    const cancelado = items.find((c) => c.status === "cancelado")!;
    expect(effectiveStatus(cancelado, "confirmado")).toBe("cancelado");
    const s = inboxSummary(items, { [cancelado.id]: "confirmado" });
    expect(s.cancelados).toBe(1);
    expect(s.confirmados).toBe(0); // el cancelado no se cuela en confirmados
  });

  it("filtro 'excluidos' (decisión) no incluye un cancelado (estado del comprobante)", () => {
    const cancelado = items.find((c) => c.status === "cancelado")!;
    const excl = filterItems(items, { [cancelado.id]: "excluido" }, "excluidos");
    expect(excl.some((c) => c.id === cancelado.id)).toBe(false);
  });

  it("cfdiStatusChip mapea cancelado/pendiente con label override (StatusKind válido)", () => {
    expect(cfdiStatusChip("cancelado")).toEqual({ kind: "requiereRevision", label: "Cancelado" });
    expect(cfdiStatusChip("pendienteComplemento").label).toBe("Pendiente de complemento");
    expect(cfdiStatusChip("detectado")).toEqual({ kind: "detectado" });
  });

  it("applyCfdiDecisions aplica confirm/exclude/review y respeta terminales", () => {
    const income = items.find((c) => c.status === "detectado")!;
    const cancelado = items.find((c) => c.status === "cancelado")!;
    const decisions: Record<string, InboxDecision> = { [income.id]: "excluido", [cancelado.id]: "confirmado" };
    const applied = applyCfdiDecisions(items, decisions);
    expect(applied.find((c) => c.id === income.id)!.status).toBe("excluido");
    expect(applied.find((c) => c.id === cancelado.id)!.status).toBe("cancelado"); // terminal intacto
  });

  it("summarizeCfdiDecisions cuenta decisiones e ignora terminales", () => {
    const income = items.find((c) => c.status === "detectado")!;
    const cancelado = items.find((c) => c.status === "cancelado")!;
    const s = summarizeCfdiDecisions(items, { [income.id]: "confirmado", [cancelado.id]: "confirmado" });
    expect(s.confirmed).toBe(1); // el cancelado (terminal) no cuenta
    expect(s.excluded).toBe(0);
    expect(s.review).toBe(0);
  });

  it("títulos e impactos son humanos y seguros (sin RFC/UUID)", () => {
    for (const c of items) {
      const t = cfdiTitle(c);
      const i = cfdiImpact(c);
      expect(t).not.toMatch(/[A-Z]{3,4}\d{6}/); // patrón de RFC
      expect(`${t} ${i}`).not.toMatch(/uuid|0000-4000/i);
    }
  });
});
