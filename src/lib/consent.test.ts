/**
 * Tests para lib/consent.ts.
 * Run: npx tsx src/lib/consent.test.ts
 *
 * tsx no expone `window`/`localStorage` por default — emulamos con un mock.
 */

// Polyfill mínimo de window + localStorage para los tests.
type Listener = (e: Event) => void;
const listeners = new Map<string, Listener[]>();
const storage = new Map<string, string>();

(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => { storage.set(k, v); },
    removeItem: (k: string) => { storage.delete(k); },
    clear: () => storage.clear(),
  },
  addEventListener: (type: string, listener: Listener) => {
    const arr = listeners.get(type) || [];
    arr.push(listener);
    listeners.set(type, arr);
  },
  removeEventListener: (type: string, listener: Listener) => {
    const arr = listeners.get(type) || [];
    listeners.set(type, arr.filter((l) => l !== listener));
  },
  dispatchEvent: (e: Event) => {
    const arr = listeners.get(e.type) || [];
    for (const l of arr) l(e);
    return true;
  },
};
(globalThis as unknown as { localStorage: unknown }).localStorage =
  (globalThis as unknown as { window: { localStorage: unknown } }).window.localStorage;

class CustomEventPolyfill<T> extends Event {
  detail: T;
  constructor(type: string, init?: { detail?: T }) {
    super(type);
    this.detail = init?.detail as T;
  }
  initCustomEvent() { /* legacy noop */ }
}
(globalThis as unknown as { CustomEvent: unknown }).CustomEvent = CustomEventPolyfill;

import {
  getConsent,
  setConsent,
  hasDecidedConsent,
  isAnalyticsAllowed,
} from "./consent";

function eq<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

function reset() {
  storage.clear();
  listeners.clear();
}

const TESTS: Array<[string, () => void]> = [
  ["default unset → analytics false", () => {
    reset();
    eq(getConsent().analytics, "unset", "unset por default");
    eq(hasDecidedConsent(), false, "no decidido");
    eq(isAnalyticsAllowed(), false, "analytics off por default");
  }],

  ["accepted persiste y se lee", () => {
    reset();
    setConsent("accepted");
    eq(getConsent().analytics, "accepted", "accepted leído");
    eq(hasDecidedConsent(), true, "decidido");
    eq(isAnalyticsAllowed(), true, "analytics on");
    const decidedAt = getConsent().decidedAt;
    if (typeof decidedAt !== "string" || decidedAt.length < 10) {
      throw new Error("decidedAt debe ser ISO string");
    }
  }],

  ["rejected persiste y se lee", () => {
    reset();
    setConsent("rejected");
    eq(getConsent().analytics, "rejected", "rejected leído");
    eq(hasDecidedConsent(), true, "decidido");
    eq(isAnalyticsAllowed(), false, "analytics off");
  }],

  ["setConsent dispara evento same-tab", () => {
    reset();
    let fired = 0;
    const handler = () => { fired++; };
    (globalThis as unknown as { window: { addEventListener: (t: string, l: Listener) => void } }).window
      .addEventListener("wedge:consent-changed", handler);
    setConsent("accepted");
    eq(fired, 1, "evento disparado una vez");
  }],

  ["localStorage corrupto → unset (no crashea)", () => {
    reset();
    storage.set("wedge:consent:v1", "{not valid json");
    eq(getConsent().analytics, "unset", "fallback a unset");
    eq(isAnalyticsAllowed(), false, "no permite analytics");
  }],

  ["valor desconocido en JSON → unset", () => {
    reset();
    storage.set("wedge:consent:v1", JSON.stringify({ analytics: "maybe" }));
    eq(getConsent().analytics, "unset", "rechaza valor inválido");
  }],

  ["decisión persiste cross-instance (mismo storage)", () => {
    reset();
    setConsent("accepted");
    // Simular nueva instancia (re-import sería ideal pero no necesario aquí
    // porque getConsent lee de localStorage cada vez).
    eq(getConsent().analytics, "accepted", "valor persiste");
  }],

  ["cambiar de accepted → rejected sobreescribe", () => {
    reset();
    setConsent("accepted");
    eq(isAnalyticsAllowed(), true, "primero on");
    setConsent("rejected");
    eq(isAnalyticsAllowed(), false, "luego off");
  }],
];

let passed = 0, failed = 0;
for (const [name, fn] of TESTS) {
  try {
    fn();
    passed++;
    console.log(`  ok ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}\n    ${(err as Error).message}`);
  }
}
console.log(`\nconsent: ${passed} passed, ${failed} failed`);
if (failed > 0 && typeof process !== "undefined") process.exit(1);
