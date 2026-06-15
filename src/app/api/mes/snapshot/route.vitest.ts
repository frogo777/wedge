import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mocks de infraestructura (auth/CSRF/obs); la lógica de persistencia es REAL ──
let __client: unknown = null;
let __csrfDenied: Response | null = null;

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => __client }));
vi.mock("@/lib/obs/with-handler", () => ({ withHandler: (h: unknown) => h }));
vi.mock("@/lib/obs/logger", () => ({ logEvent: () => {} }));
vi.mock("@/lib/obs/csrf", () => ({ requireSameOrigin: () => __csrfDenied }));

import { GET, POST, DELETE } from "./route";

interface CapturedClient {
  table?: string;
  upsertRow?: Record<string, unknown>;
  upsertOpts?: unknown;
  deleted?: boolean;
  eq?: [string, unknown][];
}

/** Cliente Supabase falso, encadenable, que captura lo que la capa de persistencia ejecuta. */
function makeClient(opts: { user?: { id: string } | null; single?: unknown; terminal?: unknown }) {
  const captured: CapturedClient = {};
  const builder: Record<string, unknown> = {};
  Object.assign(builder, {
    upsert: (row: Record<string, unknown>, o: unknown) => { captured.upsertRow = row; captured.upsertOpts = o; return builder; },
    select: () => builder,
    eq: (col: string, val: unknown) => { (captured.eq ??= []).push([col, val]); return builder; },
    order: () => builder,
    limit: () => builder,
    delete: () => { captured.deleted = true; return builder; },
    maybeSingle: async () => opts.single ?? { data: null, error: null },
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(opts.terminal ?? { error: null }).then(res, rej),
  });
  return {
    auth: { getUser: async () => ({ data: { user: opts.user ?? null } }) },
    from: (t: string) => { captured.table = t; return builder; },
    _captured: captured,
  };
}

function cleanMonth(overrides: Record<string, unknown> = {}) {
  return {
    id: "m1", userId: "DEBERIA-IGNORARSE", year: 2026, month: 6, monthLabel: "Junio 2026",
    regime: "resico_pf", regimeLabel: "RESICO PF", status: "datos_importados", progress: 10,
    deadline: "2026-07-17T00:00:00.000Z", incomeDetected: 100, incomeConfirmed: 0,
    cfdisIssued: 1, cfdisReceived: 0, isrEstimate: 1, ivaEstimate: 1, retentions: 0,
    pendingActions: [], risks: [], nextBestAction: null,
    satGuideStatus: "no_aplica", evidenceStatus: "vacio", historyPreview: [],
    createdAt: "", updatedAt: "", ...overrides,
  };
}

function req(method: string, body?: unknown) {
  return new Request("https://wedge.test/api/mes/snapshot", {
    method,
    headers: { "content-type": "application/json", origin: "https://wedge.test" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  __client = null;
  __csrfDenied = null;
});

describe("POST /api/mes/snapshot", () => {
  it("guarda y fija user_id de la SESIÓN, ignorando month.userId del body", async () => {
    const client = makeClient({ user: { id: "user-A" }, single: { data: { id: "snap-1" }, error: null } });
    __client = client;
    const res = await POST(req("POST", { month: cleanMonth(), source: "xml_preview" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, id: "snap-1" });
    // user_id viene de la sesión, NO del body.
    expect(client._captured.upsertRow?.user_id).toBe("user-A");
    expect(JSON.stringify(client._captured.upsertRow)).not.toContain("DEBERIA-IGNORARSE");
    expect(client._captured.table).toBe("fiscal_month_snapshots");
  });

  it("rechaza con 422 unsafe_payload si hay un RFC incrustado en texto whitelisted", async () => {
    const client = makeClient({ user: { id: "user-A" }, single: { data: { id: "x" }, error: null } });
    __client = client;
    const month = cleanMonth({
      pendingActions: [{
        id: "p", type: "revisar_cfdi", title: "t", description: "RFC XAXX010101000 del cliente",
        urgency: "soon", impact: "x", risk: "bajo", estimatedTime: "2 min", source: "cfdi",
        status: "todo", actionLabel: "a",
      }],
    });
    const res = await POST(req("POST", { month, source: "xml_preview" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("unsafe_payload");
    // No se intentó persistir.
    expect(client._captured.upsertRow).toBeUndefined();
  });

  it("401 si no hay sesión", async () => {
    __client = makeClient({ user: null });
    const res = await POST(req("POST", { month: cleanMonth() }));
    expect(res.status).toBe(401);
  });

  it("400 invalid_payload si el body no es un Mes Fiscal", async () => {
    __client = makeClient({ user: { id: "user-A" } });
    const res = await POST(req("POST", { month: { foo: "bar" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_payload");
  });

  it("CSRF: si requireSameOrigin niega, responde 403 y NO toca la DB", async () => {
    __csrfDenied = new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
    const client = makeClient({ user: { id: "user-A" } });
    __client = client;
    const res = await POST(req("POST", { month: cleanMonth() }));
    expect(res.status).toBe(403);
    expect(client._captured.upsertRow).toBeUndefined();
  });
});

describe("GET /api/mes/snapshot", () => {
  it("401 sin sesión", async () => {
    __client = makeClient({ user: null });
    expect((await GET(req("GET"))).status).toBe(401);
  });

  it("200 con sesión y devuelve { snapshot }", async () => {
    __client = makeClient({ user: { id: "user-A" }, single: { data: null, error: null } });
    const res = await GET(req("GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ snapshot: null });
  });
});

describe("DELETE /api/mes/snapshot", () => {
  it("401 sin sesión", async () => {
    __client = makeClient({ user: null });
    expect((await DELETE(req("DELETE", { id: "x" }))).status).toBe(401);
  });

  it("400 si falta id", async () => {
    __client = makeClient({ user: { id: "user-A" } });
    const res = await DELETE(req("DELETE", {}));
    expect(res.status).toBe(400);
  });

  it("200 y borra acotado por id + user_id de sesión", async () => {
    const client = makeClient({ user: { id: "user-A" }, terminal: { error: null } });
    __client = client;
    const res = await DELETE(req("DELETE", { id: "snap-9" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
    expect(client._captured.deleted).toBe(true);
    // acotado a la fila por id y al dueño de la sesión.
    expect(client._captured.eq).toEqual([["id", "snap-9"], ["user_id", "user-A"]]);
  });

  it("CSRF: 403 si requireSameOrigin niega", async () => {
    __csrfDenied = new Response(null, { status: 403 });
    __client = makeClient({ user: { id: "user-A" } });
    expect((await DELETE(req("DELETE", { id: "x" }))).status).toBe(403);
  });
});
