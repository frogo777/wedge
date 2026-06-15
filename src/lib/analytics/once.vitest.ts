/**
 * Tests para `fireOnce` — helper que garantiza dispara una sola vez por
 * (key + device). Usado en first_cfdi_loaded, first_calculation_viewed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock localStorage para entorno node de Vitest.
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() { return store.size; },
};

beforeEach(() => {
  store.clear();
  vi.stubGlobal("window", { localStorage: localStorageMock });
  vi.stubGlobal("localStorage", localStorageMock);
});

import { fireOnce, hasFired, resetOnce } from "./once";

describe("fireOnce", () => {
  it("dispara fn la primera vez", () => {
    const fn = vi.fn();
    fireOnce("test_event", fn);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("NO dispara fn la segunda vez con mismo key", () => {
    const fn = vi.fn();
    fireOnce("test_event", fn);
    fireOnce("test_event", fn);
    fireOnce("test_event", fn);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("dispara independientemente para keys diferentes", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    fireOnce("event_a", fn1);
    fireOnce("event_b", fn2);
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it("persiste timestamp ISO en localStorage", () => {
    fireOnce("test_persisted", () => {});
    const stored = store.get("wedge:once:v1:test_persisted");
    expect(stored).toBeDefined();
    expect(stored).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO timestamp
  });

  it("hasFired refleja el estado correctamente", () => {
    expect(hasFired("never_fired")).toBe(false);
    fireOnce("test_check", () => {});
    expect(hasFired("test_check")).toBe(true);
  });

  it("resetOnce permite re-disparar (útil para tests)", () => {
    const fn = vi.fn();
    fireOnce("test_reset", fn);
    resetOnce("test_reset");
    fireOnce("test_reset", fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("fn que throws no rompe el marker (queda registrado)", () => {
    const fn = vi.fn(() => { throw new Error("posthog down"); });
    // Spec: try/catch interno — fireOnce nunca propaga
    expect(() => fireOnce("test_throws", fn)).not.toThrow();
    expect(hasFired("test_throws")).toBe(true);
    // Segunda llamada NO ejecuta fn (ya marcado como fired)
    fireOnce("test_throws", fn);
    expect(fn).toHaveBeenCalledOnce();
  });
});
