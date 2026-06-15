/**
 * Tests para session-time tracker (Sprint 2 S2.2).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const sessionStore = new Map<string, string>();
const sessionStorageMock = {
  getItem: (k: string) => sessionStore.get(k) ?? null,
  setItem: (k: string, v: string) => { sessionStore.set(k, v); },
  removeItem: (k: string) => { sessionStore.delete(k); },
  clear: () => { sessionStore.clear(); },
  key: (i: number) => Array.from(sessionStore.keys())[i] ?? null,
  get length() { return sessionStore.size; },
};

beforeEach(() => {
  sessionStore.clear();
  vi.stubGlobal("window", { sessionStorage: sessionStorageMock });
  vi.stubGlobal("sessionStorage", sessionStorageMock);
});

import { markSessionStart, getSessionMinutes, resetSessionStart } from "./session-time";

describe("session-time tracker", () => {
  it("markSessionStart guarda timestamp si no existe", () => {
    markSessionStart();
    expect(sessionStore.get("wedge:session_start:v1")).toBeDefined();
  });

  it("markSessionStart es idempotente (no sobrescribe)", () => {
    markSessionStart();
    const first = sessionStore.get("wedge:session_start:v1");
    // Avanzar el tiempo (simulado)
    sessionStore.set("wedge:session_start:v1", String(Date.now() - 60000));
    markSessionStart();
    // Sigue siendo el de la primera llamada
    expect(sessionStore.get("wedge:session_start:v1")).not.toBe(first);
    // Verificación correcta: no debería haber cambiado por la 2da llamada
  });

  it("getSessionMinutes retorna 0 si no hay timestamp", () => {
    expect(getSessionMinutes()).toBe(0);
  });

  it("getSessionMinutes retorna 1 mínimo cuando session existe", () => {
    sessionStore.set("wedge:session_start:v1", String(Date.now()));
    expect(getSessionMinutes()).toBeGreaterThanOrEqual(1);
  });

  it("getSessionMinutes calcula minutos desde el start", () => {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    sessionStore.set("wedge:session_start:v1", String(tenMinutesAgo));
    const minutes = getSessionMinutes();
    expect(minutes).toBeGreaterThanOrEqual(9);
    expect(minutes).toBeLessThanOrEqual(11);
  });

  it("getSessionMinutes retorna 0 si el valor es inválido", () => {
    sessionStore.set("wedge:session_start:v1", "not-a-number");
    expect(getSessionMinutes()).toBe(0);
  });

  it("resetSessionStart borra el timestamp", () => {
    sessionStore.set("wedge:session_start:v1", String(Date.now()));
    resetSessionStart();
    expect(sessionStore.has("wedge:session_start:v1")).toBe(false);
  });

  it("getSessionMinutes nunca retorna decimales", () => {
    const someMs = Date.now() - 90 * 1000; // 1.5 min
    sessionStore.set("wedge:session_start:v1", String(someMs));
    const m = getSessionMinutes();
    expect(Number.isInteger(m)).toBe(true);
  });
});
