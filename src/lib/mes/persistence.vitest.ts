import { describe, it, expect } from "vitest";
import type { FiscalMonth, PendingAction, Risk } from "./types";
import {
  sanitizeFiscalMonthForPersistence,
  assertNoSensitiveFields,
  fiscalMonthFromSnapshot,
  PRIVACY_LEVEL,
  type StoredFiscalMonthSnapshot,
} from "./persistence";

const pending: PendingAction = {
  id: "cfdi-confirmar-ingresos",
  type: "confirmar_ingreso",
  title: "Confirmar 3 ingresos detectados",
  description: "Detectamos 3 CFDI de ingreso por $50,000 aprox.",
  urgency: "soon",
  impact: "+ base de tu ISR del mes",
  risk: "bajo",
  estimatedTime: "2 min",
  source: "cfdi",
  status: "current",
  actionLabel: "Revisar ingresos",
};

const risk: Risk = {
  id: "cfdi-risk-cancelado",
  severity: "atencion",
  title: "1 CFDI cancelado en el periodo",
  explanation: "Un comprobante aparece cancelado; revisa que no cuente como ingreso.",
  source: "cfdi",
  recommendedAction: "Revisar en tu Fiscal Inbox",
};

function makeMonth(overrides: Partial<FiscalMonth> = {}): FiscalMonth {
  return {
    id: "mes-2026-06",
    userId: "user-abc",
    year: 2026,
    month: 6,
    monthLabel: "Junio 2026",
    regime: "resico_pf",
    regimeLabel: "RESICO PF",
    status: "datos_importados",
    progress: 40,
    deadline: "2026-07-17T00:00:00.000Z",
    incomeDetected: 50000,
    incomeConfirmed: 0,
    cfdisIssued: 3,
    cfdisReceived: 1,
    isrEstimate: 1250,
    ivaEstimate: 8000,
    retentions: 500,
    pendingActions: [pending],
    risks: [risk],
    nextBestAction: pending,
    satGuideStatus: "no_aplica",
    evidenceStatus: "vacio",
    historyPreview: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("sanitizeFiscalMonthForPersistence", () => {
  const month = makeMonth();
  const input = sanitizeFiscalMonthForPersistence(month, {
    source: "xml_preview",
    decisions: { confirmed: 2, excluded: 1, review: 0 },
    luk: { total: 3, warning: 1, review: 1, info: 1 },
  });

  it("hace whitelist: no incluye id ni userId del FiscalMonth", () => {
    const rec = input as unknown as Record<string, unknown>;
    expect(rec.id).toBeUndefined();
    expect(rec.userId).toBeUndefined();
    expect(rec.user_id).toBeUndefined();
  });

  it("marca privacy_level como redacted_snapshot", () => {
    expect(input.privacy_level).toBe(PRIVACY_LEVEL);
    expect(input.privacy_level).toBe("redacted_snapshot");
  });

  it("convierte deadline ISO a date-only", () => {
    expect(input.deadline_date).toBe("2026-07-17");
  });

  it("deadline_date es null si no hay deadline", () => {
    const noDeadline = sanitizeFiscalMonthForPersistence(makeMonth({ deadline: "" }), { source: "demo" });
    expect(noDeadline.deadline_date).toBeNull();
  });

  it("propaga source, decisions y luk", () => {
    expect(input.source).toBe("xml_preview");
    expect(input.decisions_summary).toEqual({ confirmed: 2, excluded: 1, review: 0 });
    expect(input.luk_signal_summary).toEqual({ total: 3, warning: 1, review: 1, info: 1 });
  });

  it("usa objetos vacíos cuando no se pasan decisions/luk", () => {
    const minimal = sanitizeFiscalMonthForPersistence(month, { source: "demo" });
    expect(minimal.decisions_summary).toEqual({});
    expect(minimal.luk_signal_summary).toEqual({});
  });

  it("copia los agregados del mes", () => {
    expect(input.income_detected).toBe(50000);
    expect(input.isr_estimate).toBe(1250);
    expect(input.iva_estimate).toBe(8000);
    expect(input.cfdis_issued_count).toBe(3);
    expect(input.cfdis_received_count).toBe(1);
  });

  it("proyecta pending_actions/risks: descarta campos inesperados (sub-whitelist)", () => {
    // Un motor futuro podría inyectar un campo sensible; la proyección no debe dejarlo pasar.
    const dirty = makeMonth({
      pendingActions: [{ ...pending, rfcRelacionado: "XAXX010101000" } as unknown as typeof pending],
      risks: [{ ...risk, emisorNombre: "ACME SA" } as unknown as typeof risk],
    });
    const out = sanitizeFiscalMonthForPersistence(dirty, { source: "demo" });
    expect((out.pending_actions[0] as unknown as Record<string, unknown>).rfcRelacionado).toBeUndefined();
    expect((out.risks[0] as unknown as Record<string, unknown>).emisorNombre).toBeUndefined();
    // Y el resultado proyectado pasa el assert (no quedó PII).
    expect(() => assertNoSensitiveFields(out)).not.toThrow();
    // Conserva los campos legítimos.
    expect(out.pending_actions[0].title).toBe(pending.title);
    expect(out.risks[0].severity).toBe(risk.severity);
  });

  it("un snapshot real pasa assertNoSensitiveFields (sin PII)", () => {
    expect(() => assertNoSensitiveFields(input)).not.toThrow();
  });
});

describe("assertNoSensitiveFields", () => {
  it("no lanza con un snapshot limpio", () => {
    const input = sanitizeFiscalMonthForPersistence(makeMonth(), { source: "demo" });
    expect(() => assertNoSensitiveFields(input)).not.toThrow();
  });

  it.each([
    ["rfc", { rfc: "XAXX010101000" }],
    ["raw_xml", { raw_xml: "<cfdi:Comprobante/>" }],
    ["xml", { xml: "algo" }],
    ["zip", { zip: "bytes" }],
    ["uuid", { uuid: "abc" }],
    ["ciec", { ciec: "1234" }],
    ["efirma", { efirma: "fiel" }],
    ["e_firma", { e_firma: "fiel" }],
    ["sat_password", { sat_password: "x" }],
    ["raw_cfdis", { raw_cfdis: [] }],
    ["emisor", { emisor: "Empresa SA" }],
    ["receptor", { receptor: "Cliente SA" }],
    ["nombre", { nombre: "Juan Pérez" }],
    ["name", { name: "Juan Pérez" }],
    ["razon_social", { razon_social: "ACME SA de CV" }],
    ["email", { email: "a@b.com" }],
    ["correo", { correo: "a@b.com" }],
    ["telefono", { telefono: "5512345678" }],
    ["domicilio", { domicilio: "Calle 123" }],
  ])("lanza si hay clave prohibida: %s", (_label, payload) => {
    expect(() => assertNoSensitiveFields(payload)).toThrow();
  });

  it("detecta un RFC en minúsculas (regex case-insensitive)", () => {
    expect(() => assertNoSensitiveFields({ note: "el rfc es xaxx010101000 en el comprobante" })).toThrow(/RFC/);
  });

  it("detecta un UUID en formato compacto de 32 hex (sin guiones)", () => {
    expect(() => assertNoSensitiveFields({ note: "folio 1234567890abcdef1234567890abcdef interno" })).toThrow(/UUID/);
  });

  it("detecta un email en un valor de texto", () => {
    expect(() => assertNoSensitiveFields({ note: "escríbeme a juan@example.com hoy" })).toThrow(/email/);
  });

  it("detecta un teléfono de 10 dígitos en un valor de texto", () => {
    expect(() => assertNoSensitiveFields({ note: "mi tel es 5512345678 ok" })).toThrow(/teléfono/);
  });

  it("NO trata un monto numérico grande como teléfono (sin falso positivo)", () => {
    // 10 dígitos pero en un campo NUMÉRICO → no se escanea como texto libre.
    expect(() => assertNoSensitiveFields({ income_detected: 1234567890, retentions: 9876543210 })).not.toThrow();
  });

  it("detecta clave prohibida sin importar mayúsculas", () => {
    expect(() => assertNoSensitiveFields({ RFC: "x" })).toThrow();
    expect(() => assertNoSensitiveFields({ Raw_XML: "x" })).toThrow();
  });

  it("detecta clave prohibida anidada (dentro de pending_actions)", () => {
    const payload = { pending_actions: [{ id: "x", rfc: "XAXX010101000" }] };
    expect(() => assertNoSensitiveFields(payload)).toThrow();
  });

  it("detecta un RFC en un valor de texto", () => {
    expect(() => assertNoSensitiveFields({ note: "El RFC es XAXX010101000 según el CFDI" })).toThrow(/RFC/);
  });

  it("detecta un UUID en un valor de texto", () => {
    expect(() =>
      assertNoSensitiveFields({ note: "folio 12345678-1234-1234-1234-1234567890ab" }),
    ).toThrow(/UUID/);
  });

  it("detecta XML CFDI en un valor de texto", () => {
    expect(() => assertNoSensitiveFields({ note: "<cfdi:Comprobante Total='100'/>" })).toThrow(/CFDI/);
  });

  it("no lanza con texto fiscal genérico sin PII (montos, etiquetas)", () => {
    expect(() =>
      assertNoSensitiveFields({
        month_label: "Junio 2026",
        impact: "+ $2,180 a tu IVA del mes",
        title: "Confirmar 3 ingresos",
      }),
    ).not.toThrow();
  });
});

describe("fiscalMonthFromSnapshot", () => {
  function makeSnap(overrides: Partial<StoredFiscalMonthSnapshot> = {}): StoredFiscalMonthSnapshot {
    const input = sanitizeFiscalMonthForPersistence(makeMonth(), { source: "xml_preview" });
    return {
      ...input,
      id: "snap-1",
      user_id: "user-abc",
      created_at: "2026-06-01T00:00:00.000Z",
      updated_at: "2026-06-10T00:00:00.000Z",
      ...overrides,
    };
  }

  it("reconstruye los campos núcleo del FiscalMonth", () => {
    const month = fiscalMonthFromSnapshot(makeSnap());
    expect(month.id).toBe("snap-1");
    expect(month.userId).toBe("user-abc");
    expect(month.year).toBe(2026);
    expect(month.month).toBe(6);
    expect(month.monthLabel).toBe("Junio 2026");
    expect(month.incomeDetected).toBe(50000);
    expect(month.isrEstimate).toBe(1250);
  });

  it("reconstruye el deadline ISO desde date-only", () => {
    const month = fiscalMonthFromSnapshot(makeSnap());
    expect(month.deadline).toBe("2026-07-17T00:00:00.000Z");
  });

  it("deadline vacío si no hay deadline_date", () => {
    const month = fiscalMonthFromSnapshot(makeSnap({ deadline_date: null }));
    expect(month.deadline).toBe("");
  });

  it("mapea regime honorarios y su label", () => {
    const month = fiscalMonthFromSnapshot(makeSnap({ regime: "honorarios" }));
    expect(month.regime).toBe("honorarios");
    expect(month.regimeLabel).toBe("Honorarios");
  });

  it("nextBestAction = la acción current (o la primera)", () => {
    const month = fiscalMonthFromSnapshot(makeSnap());
    expect(month.nextBestAction?.status).toBe("current");
  });

  it("nextBestAction null si no hay pendientes", () => {
    const month = fiscalMonthFromSnapshot(makeSnap({ pending_actions: [] }));
    expect(month.nextBestAction).toBeNull();
  });

  it("la vista reconstruida no expone guía SAT ni evidencia inexistente", () => {
    const month = fiscalMonthFromSnapshot(makeSnap());
    expect(month.satGuideStatus).toBe("no_aplica");
    expect(month.evidenceStatus).toBe("vacio");
    expect(month.historyPreview).toEqual([]);
  });
});
