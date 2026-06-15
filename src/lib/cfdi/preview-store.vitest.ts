import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getDemoCfdis, DEMO_USER_RFC } from "./fixtures";
import {
  saveCfdiPreview, loadCfdiPreview, clearCfdiPreview, isCfdiPreviewFresh,
  redactPreviewForStorage, PREVIEW_VERSION, type StoredCfdiPreview,
  saveCfdiDecisions, loadCfdiDecisions, clearCfdiDecisions, hasTemporaryDecisions,
} from "./preview-store";

const KEY = "wedge:cfdi-preview";
const mem = new Map<string, string>();
const fakeSession = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
};

beforeEach(() => {
  mem.clear();
  vi.stubGlobal("window", { sessionStorage: fakeSession });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function build(savedAt = "2026-06-13T00:00:00.000Z"): StoredCfdiPreview {
  return {
    version: PREVIEW_VERSION,
    savedAt,
    period: "2026-06",
    monthLabel: "Junio 2026",
    regimeLabel: "RESICO PF",
    source: "upload",
    cfdis: redactPreviewForStorage(getDemoCfdis()),
    summary: { incomeDetected: 50000, isrEstimate: 300, ivaEstimate: 7360, retentions: 250 },
  };
}

describe("cfdi/preview-store", () => {
  it("round-trip save/load", () => {
    saveCfdiPreview(build());
    const loaded = loadCfdiPreview(new Date("2026-06-13T01:00:00.000Z"));
    expect(loaded?.cfdis).toHaveLength(7);
    expect(loaded?.summary.incomeDetected).toBe(50000);
    expect(loaded?.source).toBe("upload");
  });

  it("NO guarda XML crudo, RFC completo ni UUID", () => {
    saveCfdiPreview(build());
    const raw = mem.get(KEY)!;
    expect(raw).not.toContain(DEMO_USER_RFC);
    expect(raw).not.toContain("00000000-0000-4000-8000");
    expect(raw.toLowerCase()).not.toContain("<cfdi");
    expect(raw).not.toMatch(/uuid/i);
    expect(raw).not.toMatch(/rfc/i);
  });

  it("expira tras el TTL de 24 h", () => {
    saveCfdiPreview(build("2026-06-01T00:00:00.000Z"));
    expect(loadCfdiPreview(new Date("2026-06-13T00:00:00.000Z"))).toBeNull();
  });

  it("isCfdiPreviewFresh respeta la ventana de 24 h", () => {
    const p = build("2026-06-13T00:00:00.000Z");
    expect(isCfdiPreviewFresh(p, new Date("2026-06-13T10:00:00.000Z"))).toBe(true);
    expect(isCfdiPreviewFresh(p, new Date("2026-06-14T01:00:00.000Z"))).toBe(false);
  });

  it("version distinta → null (no carga formatos viejos)", () => {
    saveCfdiPreview({ ...build(), version: 999 });
    expect(loadCfdiPreview(new Date("2026-06-13T01:00:00.000Z"))).toBeNull();
  });

  it("descarta un preview con CFDIs de forma inválida (fail-safe, no crashea el render)", () => {
    mem.set(KEY, JSON.stringify({ ...build(), cfdis: [{ id: "x" }] }));
    expect(loadCfdiPreview(new Date("2026-06-13T01:00:00.000Z"))).toBeNull();
  });

  it("clearCfdiPreview borra el preview", () => {
    saveCfdiPreview(build());
    clearCfdiPreview();
    expect(loadCfdiPreview(new Date("2026-06-13T01:00:00.000Z"))).toBeNull();
  });

  it("SSR-safe: sin window no lanza y devuelve null", () => {
    vi.unstubAllGlobals(); // window indefinido
    expect(() => saveCfdiPreview(build())).not.toThrow();
    expect(loadCfdiPreview()).toBeNull();
  });
});

describe("cfdi/preview-store — decisiones temporales (5D)", () => {
  const DKEY = "wedge:cfdi-decisions";

  const SAVE = new Date("2026-06-14T00:00:00.000Z");
  const LOAD = new Date("2026-06-14T01:00:00.000Z");

  it("guarda y carga decisiones (round-trip, mapa cfdiId→InboxDecision)", () => {
    saveCfdiDecisions({ "cfdi-a": "confirmado", "cfdi-b": "excluido", "cfdi-c": "revisar" }, SAVE);
    expect(loadCfdiDecisions(LOAD)).toEqual({
      "cfdi-a": "confirmado", "cfdi-b": "excluido", "cfdi-c": "revisar",
    });
  });

  it("el storage de decisiones NO contiene XML/RFC/UUID", () => {
    saveCfdiDecisions({ "cfdi-a": "confirmado" });
    const raw = mem.get(DKEY)!;
    expect(raw).not.toMatch(/uuid/i);
    expect(raw).not.toMatch(/rfc/i);
    expect(raw.toLowerCase()).not.toContain("<cfdi");
  });

  it("mapa vacío borra la entrada", () => {
    saveCfdiDecisions({ "cfdi-a": "confirmado" });
    saveCfdiDecisions({});
    expect(mem.has(DKEY)).toBe(false);
    expect(loadCfdiDecisions()).toEqual({});
  });

  it("hasTemporaryDecisions y clearCfdiDecisions", () => {
    saveCfdiDecisions({ "cfdi-a": "confirmado" }, SAVE);
    expect(hasTemporaryDecisions(LOAD)).toBe(true);
    clearCfdiDecisions();
    expect(hasTemporaryDecisions(LOAD)).toBe(false);
    expect(loadCfdiDecisions(LOAD)).toEqual({});
  });
});
